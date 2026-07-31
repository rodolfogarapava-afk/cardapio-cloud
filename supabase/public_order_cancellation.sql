-- Cancelamento pelo cliente do delivery, restrito à loja, telefone e pedidos
-- que ainda não entraram em preparo.

create or replace function public.cancel_public_order(
  p_tenant_id uuid,p_order_id bigint,p_phone text
) returns jsonb
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.delivery_orders%rowtype;
  v_payload jsonb;
  v_products jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_product jsonb;
  v_qty integer;
  v_ticket bytea;
begin
  select * into v_order
  from public.delivery_orders orders
  where orders.tenant_id=p_tenant_id
    and orders.id=p_order_id
    and orders.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
  for update;

  if not found then
    return jsonb_build_object('cancelled',false,'message','Pedido não encontrado.');
  end if;
  if v_order.status <> 'new' then
    return jsonb_build_object(
      'cancelled',false,
      'message','Este pedido já entrou em preparo e não pode mais ser cancelado pelo site.'
    );
  end if;

  select command.payload into v_payload
  from public.restaurant_commands command
  where command.tenant_id=p_tenant_id and command.id=p_order_id
  for update;
  v_payload := coalesce(v_payload,v_order.payload);

  if coalesce((v_payload->'delivery'->>'inventoryReserved')::boolean,false) then
    select products into v_products
    from public.restaurant_catalogs
    where tenant_id=p_tenant_id
    for update;

    for v_product in
      select value from jsonb_array_elements(coalesce(v_products,'[]'::jsonb))
    loop
      select coalesce(sum((item->>'qty')::integer),0) into v_qty
      from jsonb_array_elements(coalesce(v_payload->'items','[]'::jsonb)) item
      where item->>'productId'=v_product->>'id';
      if v_qty>0 and coalesce((v_product->>'trackStock')::boolean,true) then
        v_product:=jsonb_set(
          v_product,'{stock}',
          to_jsonb(coalesce((v_product->>'stock')::integer,0)+v_qty)
        );
      end if;
      v_updated:=v_updated||jsonb_build_array(v_product);
    end loop;

    update public.restaurant_catalogs
    set products=v_updated,updated_at=now()
    where tenant_id=p_tenant_id;
  end if;

  update public.delivery_orders
  set status='cancelled',completed_at=now(),updated_at=now()
  where tenant_id=p_tenant_id and id=p_order_id;

  -- Mantém a comanda visível para o estabelecimento e o realtime atualiza
  -- automaticamente a tela /cliente da loja correta.
  update public.restaurant_commands
  set payload=jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(payload,v_payload),'{kitchenStatus}','"cancelled"'::jsonb,true),
          '{cancelledBy}','"customer"'::jsonb,true
        ),
        '{cancelledAt}',to_jsonb(now()::text),true
      ),
      updated_at=now()
  where tenant_id=p_tenant_id and id=p_order_id;

  update public.print_jobs
  set status='failed',error_message='Pedido cancelado pelo cliente'
  where tenant_id=p_tenant_id and command_id=p_order_id
    and status in ('pending','processing');

  v_ticket :=
    decode('1b401b61011b4501','hex') ||
    convert_to('PEDIDO CANCELADO' || E'\n','UTF8') ||
    decode('1b45001b6100','hex') ||
    convert_to(
      'COMANDA #' || right(p_order_id::text,6) || E'\n' ||
      'Cliente: ' || coalesce(v_payload->>'name','Cliente') || E'\n' ||
      'Cancelado pelo cliente no delivery.' || E'\n\n\n',
      'UTF8'
    ) ||
    decode('1d5600','hex');

  insert into public.print_jobs(tenant_id,command_id,job_kind,payload)
  values (
    p_tenant_id,p_order_id,'order_cancelled',
    jsonb_build_object(
      'data',encode(v_ticket,'base64'),
      'customer',coalesce(v_payload->>'name','Cliente'),
      'source','delivery',
      'createdAt',floor(extract(epoch from clock_timestamp())*1000)
    )
  )
  on conflict(tenant_id,command_id,job_kind) do nothing;

  return jsonb_build_object('cancelled',true,'status','cancelled');
end
$$;

revoke all on function public.cancel_public_order(uuid,bigint,text) from public;
grant execute on function public.cancel_public_order(uuid,bigint,text) to anon,authenticated;
notify pgrst, 'reload schema';
