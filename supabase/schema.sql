create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  delivery_enabled boolean not null default false,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'blocked', 'canceled')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role text not null default 'tenant_user'
    check (platform_role in ('super_admin', 'tenant_admin', 'tenant_user')),
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner', 'manager', 'cashier', 'kitchen', 'staff')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_memberships_user_id_idx
  on public.tenant_memberships(user_id);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;

create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "members read their memberships"
  on public.tenant_memberships for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "members read their tenant"
  on public.tenants for select
  to authenticated
  using (
    exists (
      select 1
      from public.tenant_memberships membership
      where membership.tenant_id = tenants.id
        and membership.user_id = (select auth.uid())
    )
  );
