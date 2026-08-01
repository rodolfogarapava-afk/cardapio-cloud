-- Phone-only delivery access.
-- The product intentionally does not use SMS or passwords. Explicitly confirming
-- a registered phone therefore creates (or rotates) the private device token.

create extension if not exists pgcrypto;

create or replace function public.activate_public_customer_access(
  p_tenant_id uuid,
  p_phone text
) returns jsonb
language plpgsql security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_phone text:=regexp_replace(coalesce(p_phone,''),'\D','','g');
  v_customer public.delivery_customers%rowtype;
  v_new_token text;
begin
  if length(v_phone) not in (10,11) then
    raise exception 'Telefone invalido';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text),hashtext(v_phone));

  select customer.* into v_customer
  from public.delivery_customers customer
  join public.tenants tenant on tenant.id=customer.tenant_id
  where customer.tenant_id=p_tenant_id
    and customer.phone=v_phone
    and tenant.delivery_enabled=true
    and tenant.subscription_status in ('active','trial','past_due')
  for update of customer;

  if not found then
    return null;
  end if;

  v_new_token:=encode(gen_random_bytes(32),'hex');
  update public.delivery_customers
  set access_token_hash=encode(digest(v_new_token,'sha256'),'hex')
  where tenant_id=p_tenant_id and phone=v_phone;

  return jsonb_build_object(
    'name',v_customer.name,'phone',v_customer.phone,
    'street',v_customer.street,'number',v_customer.number,
    'neighborhood',v_customer.neighborhood,'reference',v_customer.reference,
    'latitude',v_customer.latitude,'longitude',v_customer.longitude,
    'accessToken',v_new_token
  );
end
$$;

revoke all on function public.activate_public_customer_access(uuid,text) from public;
grant execute on function public.activate_public_customer_access(uuid,text) to anon,authenticated;

-- Direct checkout must also activate the device. This covers customers who do
-- not use the "Entrar" button before placing an order.
create or replace function public.submit_public_order(
  p_tenant_id uuid,p_customer jsonb,p_order jsonb
) returns jsonb
language plpgsql security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_phone text:=regexp_replace(coalesce(p_customer->>'phone',''),'\D','','g');
  v_supplied_token text:=coalesce(p_customer->>'accessToken','');
  v_customer public.delivery_customers%rowtype;
  v_result jsonb;
  v_new_token text;
  v_authorized boolean:=false;
begin
  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text),hashtext(v_phone));

  select * into v_customer
  from public.delivery_customers
  where tenant_id=p_tenant_id and phone=v_phone
  for update;

  v_authorized:=found and v_customer.access_token_hash is not null
    and encode(digest(v_supplied_token,'sha256'),'hex')=v_customer.access_token_hash;

  v_result:=public.submit_public_order_internal(p_tenant_id,p_customer,p_order);

  if v_authorized then
    return v_result||jsonb_build_object('customerToken',v_supplied_token);
  end if;

  v_new_token:=encode(gen_random_bytes(32),'hex');
  update public.delivery_customers
  set access_token_hash=encode(digest(v_new_token,'sha256'),'hex')
  where tenant_id=p_tenant_id and phone=v_phone;

  return v_result||jsonb_build_object('customerToken',v_new_token);
end
$$;

revoke all on function public.submit_public_order(uuid,jsonb,jsonb) from public;
grant execute on function public.submit_public_order(uuid,jsonb,jsonb) to anon,authenticated;
notify pgrst, 'reload schema';
