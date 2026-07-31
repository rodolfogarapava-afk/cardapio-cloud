-- Security hardening: privilege escalation protection and device-bound public sessions.
-- Safe to run once after delivery_reliability.sql and public_order_cancellation.sql.

create extension if not exists pgcrypto;

-- A tenant user may edit their own profile, but must never promote their own
-- platform role. RLS alone is row-based and does not protect individual columns.
create or replace function public.protect_profile_platform_role()
returns trigger
language plpgsql security definer
set search_path=public,pg_temp
as $$
begin
  if new.platform_role is distinct from old.platform_role
     and not public.is_platform_admin() then
    raise exception 'A alteração do nível de acesso não é permitida';
  end if;
  return new;
end
$$;

drop trigger if exists protect_profile_platform_role on public.profiles;
create trigger protect_profile_platform_role
before update on public.profiles
for each row execute function public.protect_profile_platform_role();

revoke all on function public.protect_profile_platform_role() from public,anon,authenticated;

alter table public.delivery_customers
  add column if not exists access_token_hash text;

-- Preserve the existing, server-validated order implementation behind a
-- wrapper. The wrapper issues an invisible per-device token after the first
-- successful order, without asking the customer for a password or SMS.
do $$
begin
  if to_regprocedure('public.submit_public_order_internal(uuid,jsonb,jsonb)') is null then
    alter function public.submit_public_order(uuid,jsonb,jsonb)
      rename to submit_public_order_internal;
  end if;
end
$$;

revoke all on function public.submit_public_order_internal(uuid,jsonb,jsonb)
  from public,anon,authenticated;

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
  select * into v_customer
  from public.delivery_customers
  where tenant_id=p_tenant_id and phone=v_phone
  for update;

  v_authorized:=found and v_customer.access_token_hash is not null
    and encode(digest(v_supplied_token,'sha256'),'hex')=v_customer.access_token_hash;

  v_result:=public.submit_public_order_internal(p_tenant_id,p_customer,p_order);

  if v_customer.tenant_id is null or v_customer.access_token_hash is null then
    v_new_token:=encode(gen_random_bytes(32),'hex');
    update public.delivery_customers
    set access_token_hash=encode(digest(v_new_token,'sha256'),'hex')
    where tenant_id=p_tenant_id and phone=v_phone;
    return v_result||jsonb_build_object('customerToken',v_new_token);
  end if;

  if v_authorized then
    return v_result||jsonb_build_object('customerToken',v_supplied_token);
  end if;

  -- A different device may place a new order with the same contact number,
  -- but it cannot overwrite or read the saved customer profile.
  update public.delivery_customers set
    name=v_customer.name,street=v_customer.street,number=v_customer.number,
    neighborhood=v_customer.neighborhood,reference=v_customer.reference,
    latitude=v_customer.latitude,longitude=v_customer.longitude,
    access_token_hash=v_customer.access_token_hash
  where tenant_id=p_tenant_id and phone=v_phone;
  return v_result;
end
$$;

revoke all on function public.submit_public_order(uuid,jsonb,jsonb) from public;
grant execute on function public.submit_public_order(uuid,jsonb,jsonb) to anon,authenticated;

drop function if exists public.get_public_customer(uuid,text);
create function public.get_public_customer(
  p_tenant_id uuid,p_phone text,p_access_token text
) returns jsonb
language sql stable security definer
set search_path=public,extensions,pg_temp
as $$
  select jsonb_build_object(
    'name',customer.name,'phone',customer.phone,'street',customer.street,
    'number',customer.number,'neighborhood',customer.neighborhood,
    'reference',customer.reference,'latitude',customer.latitude,
    'longitude',customer.longitude
  )
  from public.delivery_customers customer
  join public.tenants tenant on tenant.id=customer.tenant_id
  where customer.tenant_id=p_tenant_id
    and customer.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
    and customer.access_token_hash=encode(digest(coalesce(p_access_token,''),'sha256'),'hex')
    and tenant.delivery_enabled=true
    and tenant.subscription_status in ('active','trial','past_due')
  limit 1
$$;
revoke all on function public.get_public_customer(uuid,text,text) from public;
grant execute on function public.get_public_customer(uuid,text,text) to anon,authenticated;

drop function if exists public.get_public_customer_orders(uuid,text);
create function public.get_public_customer_orders(
  p_tenant_id uuid,p_phone text,p_access_token text
) returns jsonb
language sql stable security definer
set search_path=public,extensions,pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',orders.id,'status',orders.status,'payload',orders.payload,
    'createdAt',orders.created_at,'updatedAt',orders.updated_at
  ) order by orders.created_at desc),'[]'::jsonb)
  from public.delivery_orders orders
  join public.delivery_customers customer
    on customer.tenant_id=orders.tenant_id and customer.phone=orders.phone
  where orders.tenant_id=p_tenant_id
    and orders.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
    and customer.access_token_hash=encode(digest(coalesce(p_access_token,''),'sha256'),'hex')
$$;
revoke all on function public.get_public_customer_orders(uuid,text,text) from public;
grant execute on function public.get_public_customer_orders(uuid,text,text) to anon,authenticated;

drop function if exists public.get_public_order_status(uuid,bigint,text);
create function public.get_public_order_status(
  p_tenant_id uuid,p_order_id bigint,p_phone text,p_access_token text
) returns jsonb
language sql stable security definer
set search_path=public,extensions,pg_temp
as $$
  select jsonb_build_object(
    'id',orders.id,'kitchenStatus',orders.status,
    'updatedAt',orders.updated_at,'completedAt',orders.completed_at
  )
  from public.delivery_orders orders
  join public.delivery_customers customer
    on customer.tenant_id=orders.tenant_id and customer.phone=orders.phone
  where orders.tenant_id=p_tenant_id and orders.id=p_order_id
    and orders.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
    and customer.access_token_hash=encode(digest(coalesce(p_access_token,''),'sha256'),'hex')
  limit 1
$$;
revoke all on function public.get_public_order_status(uuid,bigint,text,text) from public;
grant execute on function public.get_public_order_status(uuid,bigint,text,text) to anon,authenticated;

-- Keep the already tested cancellation implementation internal and require
-- the same device token before it can be called publicly.
do $$
begin
  if to_regprocedure('public.cancel_public_order_internal(uuid,bigint,text)') is null then
    alter function public.cancel_public_order(uuid,bigint,text)
      rename to cancel_public_order_internal;
  end if;
end
$$;
revoke all on function public.cancel_public_order_internal(uuid,bigint,text)
  from public,anon,authenticated;

create or replace function public.cancel_public_order(
  p_tenant_id uuid,p_order_id bigint,p_phone text,p_access_token text
) returns jsonb
language plpgsql security definer
set search_path=public,extensions,pg_temp
as $$
begin
  if not exists (
    select 1 from public.delivery_customers customer
    where customer.tenant_id=p_tenant_id
      and customer.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
      and customer.access_token_hash=encode(digest(coalesce(p_access_token,''),'sha256'),'hex')
  ) then
    return jsonb_build_object('cancelled',false,'message','Acesso não autorizado neste aparelho.');
  end if;
  return public.cancel_public_order_internal(p_tenant_id,p_order_id,p_phone);
end
$$;
revoke all on function public.cancel_public_order(uuid,bigint,text,text) from public;
grant execute on function public.cancel_public_order(uuid,bigint,text,text) to anon,authenticated;

-- Remove broad defaults from privileged helpers. Explicit grants remain.
revoke all on function public.is_platform_admin() from public,anon;
grant execute on function public.is_platform_admin() to authenticated;

notify pgrst,'reload schema';
