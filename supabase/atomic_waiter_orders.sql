-- Operacoes atomicas de estoque para impedir que pedidos simultaneos do
-- garcom e do delivery sobrescrevam a quantidade um do outro.

create or replace function public.adjust_catalog_stock(
  p_tenant_id uuid,p_deltas jsonb
) returns jsonb
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  v_products jsonb;
  v_updated jsonb:='[]'::jsonb;
  v_product jsonb;
  v_delta integer;
  v_stock integer;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships
    where tenant_id=p_tenant_id and user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  if jsonb_typeof(p_deltas)<>'array' then raise exception 'Movimentacao invalida'; end if;

  select products into v_products from public.restaurant_catalogs
  where tenant_id=p_tenant_id for update;
  if not found then raise exception 'Catalogo nao encontrado'; end if;

  for v_product in select value from jsonb_array_elements(coalesce(v_products,'[]'::jsonb))
  loop
    select coalesce(sum((delta->>'qty')::integer),0) into v_delta
    from jsonb_array_elements(p_deltas) delta
    where case
      when nullif(delta->>'productId','') is not null
        then delta->>'productId'=v_product->>'id'
      else delta->>'name'=v_product->>'name'
    end;

    if v_delta<>0 and coalesce((v_product->>'trackStock')::boolean,true) then
      v_stock:=coalesce((v_product->>'stock')::integer,0)+v_delta;
      if v_stock<0 then raise exception 'Estoque insuficiente para %',v_product->>'name'; end if;
      v_product:=jsonb_set(v_product,'{stock}',to_jsonb(v_stock));
    end if;
    v_updated:=v_updated||jsonb_build_array(v_product);
  end loop;

  update public.restaurant_catalogs set products=v_updated,updated_at=now()
  where tenant_id=p_tenant_id;
  return v_updated;
end
$$;

revoke all on function public.adjust_catalog_stock(uuid,jsonb) from public;
revoke all on function public.adjust_catalog_stock(uuid,jsonb) from anon;
grant execute on function public.adjust_catalog_stock(uuid,jsonb) to authenticated;

create or replace function public.submit_waiter_order(
  p_tenant_id uuid,p_command jsonb
) returns jsonb
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  v_id bigint;
  v_name text:=trim(coalesce(p_command->>'name',''));
  v_waiter text:=trim(coalesce(p_command->>'waiterName',''));
  v_products jsonb;
  v_updated jsonb:='[]'::jsonb;
  v_items jsonb:='[]'::jsonb;
  v_requested jsonb;
  v_product jsonb;
  v_product_id text;
  v_qty integer;
  v_reserved integer;
  v_stock integer;
  v_price numeric;
  v_count integer:=0;
  v_total numeric:=0;
  v_payload jsonb;
  v_existing jsonb;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships
    where tenant_id=p_tenant_id and user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  begin v_id:=(p_command->>'id')::bigint;
  exception when others then raise exception 'Identificador da comanda invalido'; end;
  if v_name='' or v_waiter='' then raise exception 'Mesa/cliente e garcom sao obrigatorios'; end if;
  if jsonb_typeof(p_command->'items')<>'array' or jsonb_array_length(p_command->'items')=0 then
    raise exception 'Comanda sem itens';
  end if;

  select payload into v_existing from public.restaurant_commands
  where tenant_id=p_tenant_id and id=v_id;
  if v_existing is not null then return v_existing; end if;

  select products into v_products from public.restaurant_catalogs
  where tenant_id=p_tenant_id for update;
  if not found then raise exception 'Catalogo nao encontrado'; end if;

  for v_requested in select value from jsonb_array_elements(p_command->'items')
  loop
    v_product_id:=coalesce(v_requested->>'productId','');
    begin v_qty:=(v_requested->>'qty')::integer;
    exception when others then raise exception 'Quantidade invalida'; end;
    if v_qty<1 or v_qty>99 then raise exception 'Quantidade invalida'; end if;

    select value into v_product from jsonb_array_elements(v_products) item
    where item.value->>'id'=v_product_id limit 1;
    if v_product is null then raise exception 'Produto nao encontrado'; end if;
    v_price:=coalesce((v_product->>'price')::numeric,0);
    v_stock:=coalesce((v_product->>'stock')::integer,0);
    if coalesce((v_product->>'trackStock')::boolean,true) and v_stock<v_qty then
      raise exception 'Estoque insuficiente para %',v_product->>'name';
    end if;

    v_count:=v_count+v_qty;
    v_total:=v_total+(v_price*v_qty);
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'productId',v_product_id,'name',v_product->>'name','qty',v_qty,
      'price',v_price,'detail',left(coalesce(v_requested->>'detail',''),500),
      'delivered',false
    ));
    v_product:=null;
  end loop;

  for v_product in select value from jsonb_array_elements(v_products)
  loop
    select coalesce(sum((item->>'qty')::integer),0) into v_reserved
    from jsonb_array_elements(v_items) item
    where item->>'productId'=v_product->>'id';
    if v_reserved>0 and coalesce((v_product->>'trackStock')::boolean,true) then
      v_product:=jsonb_set(v_product,'{stock}',to_jsonb((v_product->>'stock')::integer-v_reserved));
    end if;
    v_updated:=v_updated||jsonb_build_array(v_product);
  end loop;

  v_payload:=jsonb_build_object(
    'id',v_id,'name',v_name,'tableLabel',v_name,'waiterName',v_waiter,
    'source','waiter','count',v_count,'total',round(v_total,2),
    'createdAt',coalesce((p_command->>'createdAt')::bigint,floor(extract(epoch from clock_timestamp())*1000)::bigint),
    'kitchenStatus','new','items',v_items
  );

  update public.restaurant_catalogs set products=v_updated,updated_at=now()
  where tenant_id=p_tenant_id;
  insert into public.restaurant_commands(tenant_id,id,payload,updated_at)
  values(p_tenant_id,v_id,v_payload,now());
  return v_payload;
end
$$;

revoke all on function public.submit_waiter_order(uuid,jsonb) from public;
revoke all on function public.submit_waiter_order(uuid,jsonb) from anon;
grant execute on function public.submit_waiter_order(uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
