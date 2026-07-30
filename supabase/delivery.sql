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
