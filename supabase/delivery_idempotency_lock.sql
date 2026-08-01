-- Serializa o primeiro acesso de um mesmo telefone por loja.
-- Evita que dois retries simultaneos emitam tokens diferentes e deixem o
-- navegador do cliente com um token que ja nao corresponde ao hash salvo.
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
  -- SELECT FOR UPDATE nao bloqueia uma linha que ainda nao existe. O lock
  -- consultivo fecha essa janela apenas para o mesmo tenant+telefone, sem
  -- reduzir o paralelismo entre clientes ou estabelecimentos diferentes.
  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text),hashtext(v_phone));

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
notify pgrst, 'reload schema';
