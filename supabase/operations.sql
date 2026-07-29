create table if not exists public.restaurant_commands (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id bigint not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.restaurant_sales (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id bigint not null,
  customer_name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text not null,
  sold_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.restaurant_expenses (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id bigint not null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  spent_at timestamptz not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists public.restaurant_catalogs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  products jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists restaurant_sales_tenant_sold_at_idx
  on public.restaurant_sales (tenant_id, sold_at desc);
create index if not exists restaurant_expenses_tenant_spent_at_idx
  on public.restaurant_expenses (tenant_id, spent_at desc);

alter table public.restaurant_commands enable row level security;
alter table public.restaurant_sales enable row level security;
alter table public.restaurant_expenses enable row level security;
alter table public.restaurant_catalogs enable row level security;

drop policy if exists "members manage restaurant commands" on public.restaurant_commands;
create policy "members manage restaurant commands"
  on public.restaurant_commands for all to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_commands.tenant_id
      and membership.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_commands.tenant_id
      and membership.user_id = (select auth.uid())
  ));

drop policy if exists "members manage restaurant sales" on public.restaurant_sales;
create policy "members manage restaurant sales"
  on public.restaurant_sales for all to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_sales.tenant_id
      and membership.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_sales.tenant_id
      and membership.user_id = (select auth.uid())
  ));

drop policy if exists "members manage restaurant expenses" on public.restaurant_expenses;
create policy "members manage restaurant expenses"
  on public.restaurant_expenses for all to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_expenses.tenant_id
      and membership.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = restaurant_expenses.tenant_id
      and membership.user_id = (select auth.uid())
  ));

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
declare
  admin_id uuid := 'b23ab4c7-e4dd-4c85-b796-ea845a9e52f1';
  restaurant_id uuid;
begin
  insert into public.profiles (id, full_name, platform_role)
  values (admin_id, 'Administrador', 'tenant_admin')
  on conflict (id) do update
    set full_name = excluded.full_name,
        platform_role = excluded.platform_role;

  select id into restaurant_id
  from public.tenants
  where slug = 'deus-proveu'
  limit 1;

  if restaurant_id is null then
    insert into public.tenants (name, slug, subscription_status)
    values ('Deus Proveu Espetinhos', 'deus-proveu', 'active')
    returning id into restaurant_id;
  end if;

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (restaurant_id, admin_id, 'owner')
  on conflict (tenant_id, user_id) do update set role = excluded.role;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.restaurant_commands;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.restaurant_sales;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.restaurant_expenses;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.restaurant_catalogs;
exception when duplicate_object then null;
end $$;
