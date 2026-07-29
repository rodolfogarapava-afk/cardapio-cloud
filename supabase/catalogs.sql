create table if not exists public.restaurant_catalogs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  products jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.restaurant_catalogs enable row level security;

drop policy if exists "members manage restaurant catalogs" on public.restaurant_catalogs;
create policy "members manage restaurant catalogs"
  on public.restaurant_catalogs for all to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_catalogs.tenant_id
      and membership.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_catalogs.tenant_id
      and membership.user_id = (select auth.uid())
  ));

do $$
begin
  alter publication supabase_realtime add table public.restaurant_catalogs;
exception when duplicate_object then null;
end $$;
