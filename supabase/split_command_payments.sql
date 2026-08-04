-- Pagamentos parciais/divididos de uma comanda.
-- Cada parcela vira uma venda própria e a comanda só é removida quando o saldo chega a zero.

create or replace function public.record_command_payment(
  p_tenant_id uuid,
  p_command_id bigint,
  p_sale_id bigint,
  p_payment_method text,
  p_amount numeric,
  p_payment_items jsonb,
  p_next_command_payload jsonb,
  p_complete boolean
) returns boolean language plpgsql security definer
set search_path=public,pg_temp as $$
declare v_payload jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'O valor do pagamento deve ser maior que zero';
  end if;

  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id=p_tenant_id
      and membership.user_id=(select auth.uid())
  ) then
    raise exception 'Acesso negado';
  end if;

  select command.payload into v_payload
  from public.restaurant_commands command
  where command.tenant_id=p_tenant_id and command.id=p_command_id
  for update;
  if v_payload is null then return false; end if;

  insert into public.restaurant_sales(
    tenant_id,id,customer_name,amount,payment_method,sold_at,payload,updated_at
  ) values (
    p_tenant_id,p_sale_id,coalesce(v_payload->>'name','Cliente'),p_amount,
    coalesce(nullif(p_payment_method,''),'Não informado'),now(),
    jsonb_build_object(
      'id',p_sale_id,
      'name',coalesce(v_payload->>'name','Cliente'),
      'total',p_amount,
      'method',coalesce(nullif(p_payment_method,''),'Não informado'),
      'createdAt',floor(extract(epoch from now())*1000)::bigint,
      'sourceCommandId',p_command_id,
      'partial',not p_complete,
      'items',coalesce(p_payment_items,'[]'::jsonb)
    ),now()
  ) on conflict(tenant_id,id) do nothing;

  if p_complete then
    update public.delivery_orders set status='completed',completed_at=now(),updated_at=now()
    where tenant_id=p_tenant_id and id=p_command_id;
    delete from public.restaurant_commands
    where tenant_id=p_tenant_id and id=p_command_id;
  else
    update public.restaurant_commands
    set payload=p_next_command_payload,updated_at=now()
    where tenant_id=p_tenant_id and id=p_command_id;
  end if;
  return true;
end
$$;

revoke all on function public.record_command_payment(uuid,bigint,bigint,text,numeric,jsonb,jsonb,boolean) from public;
revoke all on function public.record_command_payment(uuid,bigint,bigint,text,numeric,jsonb,jsonb,boolean) from anon;
grant execute on function public.record_command_payment(uuid,bigint,bigint,text,numeric,jsonb,jsonb,boolean) to authenticated;

notify pgrst,'reload schema';
