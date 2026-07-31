-- Impede que impressoras virtuais (PDF/XPS/Fax) disputem a fila da cozinha.
-- Um trabalho somente pode ser assumido por um agente que informou uma
-- impressora física válida no heartbeat.

create or replace function public.claim_print_jobs(p_token text,p_limit integer default 5)
returns table(job_id uuid,payload jsonb)
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_agent uuid;
  v_tenant uuid;
  v_printer text;
begin
  select id,tenant_id,printer_name
    into v_agent,v_tenant,v_printer
  from public.printer_agents
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and revoked_at is null;

  if v_agent is null then
    raise exception 'Agente não autorizado';
  end if;

  if nullif(trim(coalesce(v_printer,'')),'') is null
     or v_printer ~* '(PDF|XPS|OneNote|Fax|Microsoft Print|Adobe PDF|CutePDF|doPDF)' then
    raise exception 'Nenhuma impressora física válida configurada';
  end if;

  update public.print_jobs set
    status='failed',claimed_by=null,claimed_at=null,
    error_message='Agente não confirmou a impressão no prazo'
  where tenant_id=v_tenant and status='processing'
    and claimed_at < now()-interval '2 minutes';

  return query
  with candidates as (
    select jobs.id
    from public.print_jobs jobs
    where jobs.tenant_id=v_tenant
      and (jobs.status='pending' or (jobs.status='failed' and jobs.attempts<5))
    order by jobs.created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  ), claimed as (
    update public.print_jobs jobs set
      status='processing',
      claimed_by=v_agent,
      claimed_at=now(),
      attempts=jobs.attempts+1,
      error_message=null
    from candidates
    where jobs.id=candidates.id
    returning jobs.id,jobs.payload
  )
  select claimed.id,claimed.payload from claimed;
end $$;

grant execute on function public.claim_print_jobs(text,integer) to anon,authenticated;

-- O spooler do Windows pode aceitar e imprimir o RAW, mas uma oscilação curta
-- pode impedir apenas a chamada seguinte de complete_print_job. Quando o mesmo
-- agente volta a enviar heartbeat, sabemos que o ciclo local terminou. Nesse
-- caso reconciliamos trabalhos ainda presos em "processing".
create or replace function public.printer_agent_heartbeat(p_token text,p_printer_name text)
returns boolean
language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_agent uuid;
  v_tenant uuid;
begin
  update public.printer_agents
  set last_seen_at=now(),printer_name=p_printer_name
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and revoked_at is null
  returning id,tenant_id into v_agent,v_tenant;

  if v_agent is null then
    return false;
  end if;

  update public.print_jobs
  set status='printed',printed_at=now(),error_message=null
  where claimed_by=v_agent
    and status='processing'
    and claimed_at < now()-interval '5 seconds';

  update public.tenants set printer_status='online' where id=v_tenant;
  return true;
end $$;

grant execute on function public.printer_agent_heartbeat(text,text) to anon,authenticated;
notify pgrst, 'reload schema';
