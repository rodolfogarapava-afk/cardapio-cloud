-- Removes a cancelled card from the live operational queue while preserving
-- delivery_orders as the permanent customer/order history.
create or replace function public.dismiss_cancelled_command(p_command_id bigint)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_tenant uuid;
begin
  select membership.tenant_id into v_tenant
  from public.tenant_memberships membership
  where membership.user_id=(select auth.uid())
  limit 1;

  if v_tenant is null then
    raise exception 'Loja não encontrada';
  end if;

  delete from public.restaurant_commands command
  where command.tenant_id=v_tenant
    and command.id=p_command_id
    and coalesce(command.payload->>'kitchenStatus','')='cancelled';

  return found;
end
$$;

revoke all on function public.dismiss_cancelled_command(bigint) from public,anon;
grant execute on function public.dismiss_cancelled_command(bigint) to authenticated;
notify pgrst,'reload schema';
