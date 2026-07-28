alter table public.tenants add column if not exists owner_name text not null default '';
alter table public.tenants add column if not exists plan text not null default 'Essencial';
alter table public.tenants add column if not exists monthly_fee numeric(12,2) not null default 89.90;
alter table public.tenants add column if not exists due_date date;
alter table public.tenants add column if not exists printer_status text not null default 'offline'
  check (printer_status in ('online', 'offline'));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and platform_role = 'super_admin'
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.confirm_client_account(client_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado';
  end if;
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = client_user_id;
end;
$$;

revoke all on function public.confirm_client_account(uuid) from public;
grant execute on function public.confirm_client_account(uuid) to authenticated;

create or replace function public.delete_client_account(client_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  client_user_ids uuid[];
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado';
  end if;

  select coalesce(array_agg(user_id), '{}'::uuid[])
  into client_user_ids
  from public.tenant_memberships
  where tenant_id = client_tenant_id;

  delete from public.tenants where id = client_tenant_id;
  delete from auth.users where id = any(client_user_ids);
end;
$$;

revoke all on function public.delete_client_account(uuid) from public;
grant execute on function public.delete_client_account(uuid) to authenticated;

drop policy if exists "platform admins manage tenants" on public.tenants;
create policy "platform admins manage tenants"
  on public.tenants for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

drop policy if exists "platform admins manage profiles" on public.profiles;
create policy "platform admins manage profiles"
  on public.profiles for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

drop policy if exists "platform admins manage memberships" on public.tenant_memberships;
create policy "platform admins manage memberships"
  on public.tenant_memberships for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

drop policy if exists "platform admins read sales" on public.restaurant_sales;
create policy "platform admins read sales"
  on public.restaurant_sales for select to authenticated
  using ((select public.is_platform_admin()));

update public.profiles
set platform_role = 'super_admin', full_name = 'Administrador da plataforma'
where id = 'b23ab4c7-e4dd-4c85-b796-ea845a9e52f1';

update public.tenants
set owner_name = case when owner_name = '' then 'Administrador' else owner_name end,
    plan = 'Pro',
    monthly_fee = 149.90,
    due_date = coalesce(due_date, current_date + 30),
    printer_status = 'offline'
where slug = 'deus-proveu';
