-- Execute uma vez no SQL Editor quando print_queue.sql já tiver sido aplicado.
-- No Supabase, pgcrypto normalmente fica no schema extensions.

alter function public.queue_print_job(uuid,bigint,jsonb,text)
  set search_path to public, extensions;
alter function public.create_printer_activation_code(uuid,text)
  set search_path to public, extensions;
alter function public.activate_printer_agent(text,text)
  set search_path to public, extensions;
alter function public.printer_agent_heartbeat(text,text)
  set search_path to public, extensions;
alter function public.claim_print_jobs(text,integer)
  set search_path to public, extensions;
alter function public.complete_print_job(text,uuid,boolean,text)
  set search_path to public, extensions;

notify pgrst, 'reload schema';
