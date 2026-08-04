-- Finalizacao e cancelamento sempre vinculados explicitamente a loja aberta.
-- Evita buscar a primeira membership do usuario e elimina conflitos entre lojas.

create or replace function public.finalize_restaurant_command(
  p_tenant_id uuid,p_command_id bigint,p_payment_method text
) returns boolean language plpgsql security definer
set search_path=public,pg_temp as $$
declare v_payload jsonb;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id=p_tenant_id
      and membership.user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  select command.payload into v_payload
  from public.restaurant_commands command
  where command.tenant_id=p_tenant_id and command.id=p_command_id
  for update;
  if v_payload is null then return false; end if;

  insert into public.restaurant_sales(
    tenant_id,id,customer_name,amount,payment_method,sold_at,payload,updated_at
  ) values (
    p_tenant_id,p_command_id,coalesce(v_payload->>'name','Cliente'),
    coalesce((v_payload->>'total')::numeric,0),coalesce(nullif(p_payment_method,''),'Não informado'),
    now(),jsonb_build_object(
      'id',p_command_id,'name',coalesce(v_payload->>'name','Cliente'),
      'total',coalesce((v_payload->>'total')::numeric,0),
      'method',coalesce(nullif(p_payment_method,''),'Não informado'),
      'createdAt',floor(extract(epoch from now())*1000)::bigint,
      'items',coalesce(v_payload->'items','[]'::jsonb)
    ),now()
  ) on conflict(tenant_id,id) do nothing;

  update public.delivery_orders set status='completed',completed_at=now(),updated_at=now()
  where tenant_id=p_tenant_id and id=p_command_id;
  delete from public.restaurant_commands
  where tenant_id=p_tenant_id and id=p_command_id;
  return true;
end
$$;

create or replace function public.cancel_restaurant_command(
  p_tenant_id uuid,p_command_id bigint
) returns boolean language plpgsql security definer
set search_path=public,pg_temp as $$
declare
  v_payload jsonb; v_products jsonb; v_updated jsonb:='[]'::jsonb;
  v_product jsonb; v_qty integer;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id=p_tenant_id
      and membership.user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  select command.payload into v_payload
  from public.restaurant_commands command
  where command.tenant_id=p_tenant_id and command.id=p_command_id
  for update;
  if v_payload is null then return false; end if;

  if coalesce((v_payload->'delivery'->>'inventoryReserved')::boolean,false) then
    select products into v_products from public.restaurant_catalogs
    where tenant_id=p_tenant_id for update;
    for v_product in select value from jsonb_array_elements(coalesce(v_products,'[]'::jsonb))
    loop
      select coalesce(sum((item->>'qty')::integer),0) into v_qty
      from jsonb_array_elements(coalesce(v_payload->'items','[]'::jsonb)) item
      where item->>'productId'=v_product->>'id';
      if v_qty>0 and coalesce((v_product->>'trackStock')::boolean,true) then
        v_product:=jsonb_set(
          v_product,'{stock}',to_jsonb(coalesce((v_product->>'stock')::integer,0)+v_qty)
        );
      end if;
      v_updated:=v_updated||jsonb_build_array(v_product);
    end loop;
    update public.restaurant_catalogs set products=v_updated,updated_at=now()
    where tenant_id=p_tenant_id;
  end if;

  update public.delivery_orders set status='cancelled',completed_at=now(),updated_at=now()
  where tenant_id=p_tenant_id and id=p_command_id;
  delete from public.restaurant_commands
  where tenant_id=p_tenant_id and id=p_command_id;
  return true;
end
$$;

revoke all on function public.finalize_restaurant_command(uuid,bigint,text) from public;
revoke all on function public.finalize_restaurant_command(uuid,bigint,text) from anon;
revoke all on function public.cancel_restaurant_command(uuid,bigint) from public;
revoke all on function public.cancel_restaurant_command(uuid,bigint) from anon;
grant execute on function public.finalize_restaurant_command(uuid,bigint,text) to authenticated;
grant execute on function public.cancel_restaurant_command(uuid,bigint) to authenticated;

notify pgrst,'reload schema';
