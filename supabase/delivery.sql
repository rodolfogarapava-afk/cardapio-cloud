alter table public.tenants
  add column if not exists delivery_enabled boolean not null default false;

create or replace function public.get_public_menu(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'tenantId', tenant.id,
    'tenantName', tenant.name,
    'products', coalesce(catalog.products, '[]'::jsonb),
    'categories', coalesce(catalog.categories, '[]'::jsonb)
  )
  from public.tenants tenant
  left join public.restaurant_catalogs catalog on catalog.tenant_id = tenant.id
  where tenant.slug = lower(trim(p_slug))
    and tenant.delivery_enabled = true
    and tenant.subscription_status in ('active', 'trial', 'past_due')
  limit 1;
$$;

revoke all on function public.get_public_menu(text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated;

create table if not exists public.delivery_customers (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone text not null,
  name text not null,
  street text not null default '',
  number text not null default '',
  neighborhood text not null default '',
  reference text not null default '',
  latitude double precision,
  longitude double precision,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, phone)
);

alter table public.delivery_customers enable row level security;

create or replace function public.get_public_customer(p_tenant_id uuid, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'name', customer.name,
    'phone', customer.phone,
    'street', customer.street,
    'number', customer.number,
    'neighborhood', customer.neighborhood,
    'reference', customer.reference,
    'latitude', customer.latitude,
    'longitude', customer.longitude
  )
  from public.delivery_customers customer
  join public.tenants tenant on tenant.id = customer.tenant_id
  where customer.tenant_id = p_tenant_id
    and customer.phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    and tenant.delivery_enabled = true
    and tenant.subscription_status in ('active', 'trial', 'past_due')
  limit 1;
$$;

create or replace function public.submit_public_order(
  p_tenant_id uuid,
  p_customer jsonb,
  p_order jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := regexp_replace(coalesce(p_customer->>'phone', ''), '\D', '', 'g');
  v_name text := trim(coalesce(p_customer->>'name', ''));
  v_id bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_items jsonb := coalesce(p_order->'items', '[]'::jsonb);
  v_count integer := coalesce((p_order->>'count')::integer, 0);
  v_total numeric := coalesce((p_order->>'total')::numeric, 0);
  v_payload jsonb;
begin
  if not exists (
    select 1 from public.tenants tenant
    where tenant.id = p_tenant_id
      and tenant.delivery_enabled = true
      and tenant.subscription_status in ('active', 'trial', 'past_due')
  ) then
    raise exception 'Loja indisponível para pedidos';
  end if;
  if length(v_phone) <> 11 or v_name = '' then
    raise exception 'Cliente inválido';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 or v_total < 0 then
    raise exception 'Pedido inválido';
  end if;

  insert into public.delivery_customers (
    tenant_id, phone, name, street, number, neighborhood, reference, latitude, longitude, updated_at
  ) values (
    p_tenant_id, v_phone, v_name,
    coalesce(p_customer->>'street', ''),
    coalesce(p_customer->>'number', ''),
    coalesce(p_customer->>'neighborhood', ''),
    coalesce(p_customer->>'reference', ''),
    nullif(p_customer->>'latitude', '')::double precision,
    nullif(p_customer->>'longitude', '')::double precision,
    now()
  )
  on conflict (tenant_id, phone) do update set
    name = excluded.name,
    street = excluded.street,
    number = excluded.number,
    neighborhood = excluded.neighborhood,
    reference = excluded.reference,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = now();

  while exists (
    select 1 from public.restaurant_commands
    where tenant_id = p_tenant_id and id = v_id
  ) loop
    v_id := v_id + 1;
  end loop;

  v_payload := jsonb_build_object(
    'id', v_id,
    'name', v_name,
    'count', v_count,
    'total', v_total,
    'createdAt', v_id,
    'kitchenStatus', 'new',
    'items', v_items,
    'delivery', jsonb_build_object(
      'phone', v_phone,
      'fulfillment', p_order->>'fulfillment',
      'payment', p_order->>'payment',
      'street', p_customer->>'street',
      'number', p_customer->>'number',
      'neighborhood', p_customer->>'neighborhood',
      'reference', p_customer->>'reference',
      'latitude', p_customer->'latitude',
      'longitude', p_customer->'longitude',
      'notes', p_order->>'notes'
    )
  );

  insert into public.restaurant_commands (tenant_id, id, payload, updated_at)
  values (p_tenant_id, v_id, v_payload, now());

  return jsonb_build_object('id', v_id, 'status', 'created');
end;
$$;

revoke all on function public.get_public_customer(uuid, text) from public;
revoke all on function public.submit_public_order(uuid, jsonb, jsonb) from public;
grant execute on function public.get_public_customer(uuid, text) to anon, authenticated;
grant execute on function public.submit_public_order(uuid, jsonb, jsonb) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.delivery_customers;
exception when duplicate_object then null;
end $$;
