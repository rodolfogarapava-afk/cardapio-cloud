create extension if not exists pgcrypto;

create table if not exists public.printer_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null default 'Cozinha',
  device_name text not null default '',
  token_hash text not null unique,
  printer_name text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.printer_activation_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_name text not null default 'Cozinha',
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  command_id bigint not null,
  job_kind text not null default 'new_order',
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','processing','printed','failed')),
  claimed_by uuid references public.printer_agents(id) on delete set null,
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  printed_at timestamptz,
  unique (tenant_id, command_id, job_kind)
);

create index if not exists print_jobs_pending_idx
  on public.print_jobs (tenant_id, created_at)
  where status in ('pending','failed');
create index if not exists printer_agents_tenant_seen_idx
  on public.printer_agents (tenant_id, last_seen_at desc);

alter table public.printer_agents enable row level security;
alter table public.printer_activation_codes enable row level security;
alter table public.print_jobs enable row level security;

drop policy if exists "members read printer agents" on public.printer_agents;
create policy "members read printer agents" on public.printer_agents
  for select to authenticated using (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id=printer_agents.tenant_id and m.user_id=(select auth.uid())
    )
  );

drop policy if exists "members manage activation codes" on public.printer_activation_codes;
create policy "members manage activation codes" on public.printer_activation_codes
  for all to authenticated using (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id=printer_activation_codes.tenant_id and m.user_id=(select auth.uid())
    )
  ) with check (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id=printer_activation_codes.tenant_id and m.user_id=(select auth.uid())
    )
  );

drop policy if exists "members read print jobs" on public.print_jobs;
create policy "members read print jobs" on public.print_jobs
  for select to authenticated using (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id=print_jobs.tenant_id and m.user_id=(select auth.uid())
    )
  );

create or replace function public.queue_print_job(
  p_tenant_id uuid, p_command_id bigint, p_payload jsonb, p_job_kind text default 'new_order'
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships
    where tenant_id=p_tenant_id and user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  insert into public.print_jobs(tenant_id,command_id,job_kind,payload)
  values(p_tenant_id,p_command_id,p_job_kind,p_payload)
  on conflict(tenant_id,command_id,job_kind) do update
    set payload=excluded.payload
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_printer_activation_code(
  p_tenant_id uuid, p_agent_name text default 'Cozinha'
) returns text
language plpgsql security definer set search_path=public
as $$
declare v_code text;
begin
  if not public.is_platform_admin() and not exists (
    select 1 from public.tenant_memberships
    where tenant_id=p_tenant_id and user_id=(select auth.uid())
  ) then raise exception 'Acesso negado'; end if;

  update public.printer_activation_codes set used_at=coalesce(used_at,now())
  where tenant_id=p_tenant_id and used_at is null;
  v_code=upper(substr(encode(gen_random_bytes(8),'hex'),1,4)||'-'||substr(encode(gen_random_bytes(8),'hex'),1,4));
  insert into public.printer_activation_codes(tenant_id,agent_name,code_hash,expires_at,created_by)
  values(p_tenant_id,coalesce(nullif(trim(p_agent_name),''),'Cozinha'),encode(digest(v_code,'sha256'),'hex'),now()+interval '20 minutes',(select auth.uid()));
  return v_code;
end $$;

create or replace function public.activate_printer_agent(p_code text,p_device_name text)
returns table(agent_id uuid,agent_token text,tenant_id uuid,tenant_name text)
language plpgsql security definer set search_path=public
as $$
declare v_activation public.printer_activation_codes%rowtype; v_token text; v_agent uuid;
begin
  select * into v_activation from public.printer_activation_codes
  where code_hash=encode(digest(upper(trim(p_code)),'sha256'),'hex')
    and used_at is null and expires_at>now()
  for update;
  if not found then raise exception 'Código inválido ou expirado'; end if;
  v_token=encode(gen_random_bytes(32),'hex');
  insert into public.printer_agents(tenant_id,name,device_name,token_hash,last_seen_at)
  values(v_activation.tenant_id,v_activation.agent_name,coalesce(p_device_name,''),encode(digest(v_token,'sha256'),'hex'),now())
  returning id into v_agent;
  update public.printer_activation_codes set used_at=now() where id=v_activation.id;
  return query select v_agent,v_token,v_activation.tenant_id,t.name from public.tenants t where t.id=v_activation.tenant_id;
end $$;

create or replace function public.printer_agent_heartbeat(p_token text,p_printer_name text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_tenant uuid;
begin
  update public.printer_agents set last_seen_at=now(),printer_name=p_printer_name
  where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null
  returning tenant_id into v_tenant;
  if v_tenant is null then return false; end if;
  update public.tenants set printer_status='online' where id=v_tenant;
  return true;
end $$;

create or replace function public.claim_print_jobs(p_token text,p_limit integer default 5)
returns table(job_id uuid,payload jsonb)
language plpgsql security definer set search_path=public
as $$
declare v_agent uuid; v_tenant uuid;
begin
  select id,tenant_id into v_agent,v_tenant from public.printer_agents
  where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null;
  if v_agent is null then raise exception 'Agente não autorizado'; end if;
  return query
  with candidates as (
    select id from public.print_jobs
    where tenant_id=v_tenant
      and (status='pending' or (status='failed' and attempts<5))
    order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,5),20))
  ), claimed as (
    update public.print_jobs j set status='processing',claimed_by=v_agent,claimed_at=now(),
      attempts=j.attempts+1,error_message=null
    from candidates c where j.id=c.id returning j.id,j.payload
  )
  select claimed.id,claimed.payload from claimed;
end $$;

create or replace function public.complete_print_job(
  p_token text,p_job_id uuid,p_success boolean,p_error text default null
) returns boolean language plpgsql security definer set search_path=public
as $$
declare v_agent uuid; v_updated uuid;
begin
  select id into v_agent from public.printer_agents
  where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null;
  if v_agent is null then return false; end if;
  update public.print_jobs set
    status=case when p_success then 'printed' else 'failed' end,
    printed_at=case when p_success then now() else null end,
    error_message=case when p_success then null else left(coalesce(p_error,'Falha desconhecida'),500) end
  where id=p_job_id and claimed_by=v_agent returning id into v_updated;
  return v_updated is not null;
end $$;

revoke all on function public.queue_print_job(uuid,bigint,jsonb,text) from public;
revoke all on function public.create_printer_activation_code(uuid,text) from public;
grant execute on function public.queue_print_job(uuid,bigint,jsonb,text) to authenticated;
grant execute on function public.create_printer_activation_code(uuid,text) to authenticated;
grant execute on function public.activate_printer_agent(text,text) to anon,authenticated;
grant execute on function public.printer_agent_heartbeat(text,text) to anon,authenticated;
grant execute on function public.claim_print_jobs(text,integer) to anon,authenticated;
grant execute on function public.complete_print_job(text,uuid,boolean,text) to anon,authenticated;
