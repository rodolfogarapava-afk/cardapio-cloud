-- Roteamento dos pedidos do delivery por ponto de preparo.
-- Espetinhos seguem para a impressora configurada como "skewers".
-- Acompanhamentos, bebidas e categorias futuras seguem para "sides".
-- O agente sempre usa o ticket completo quando apenas uma impressora existe.

create or replace function public.queue_delivery_order_print()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery jsonb := new.payload->'delivery';
  v_catalog jsonb := '[]'::jsonb;
  v_item jsonb;
  v_item_line text;
  v_item_category text;
  v_header text;
  v_footer text;
  v_all_items text := '';
  v_skewer_items text := '';
  v_side_items text := '';
  v_skewer_count integer := 0;
  v_side_count integer := 0;
  v_body text;
  v_ticket bytea;
  v_skewer_ticket bytea;
  v_side_ticket bytea;
  v_routes jsonb := '{}'::jsonb;
  v_fulfillment text := coalesce(v_delivery->>'fulfillment', 'delivery');
begin
  if v_delivery is null or jsonb_typeof(v_delivery) <> 'object' then
    return new;
  end if;

  select coalesce(catalog.products, '[]'::jsonb)
    into v_catalog
  from public.restaurant_catalogs catalog
  where catalog.tenant_id = new.tenant_id;

  v_header :=
    'COMANDA #' || right(new.id::text, 6) || E'\n' ||
    to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || E'\n' ||
    repeat('-', 32) || E'\n' ||
    'Cliente: ' || coalesce(new.payload->>'name', '') || E'\n' ||
    'Telefone: ' || coalesce(v_delivery->>'phone', '') || E'\n';

  if v_fulfillment = 'delivery' then
    v_header := v_header ||
      'ENTREGA: ' || concat_ws(', ',
        nullif(v_delivery->>'street', ''),
        nullif(v_delivery->>'number', '')
      ) || E'\n' ||
      'Bairro: ' || coalesce(v_delivery->>'neighborhood', '') || E'\n';
    if nullif(v_delivery->>'reference', '') is not null then
      v_header := v_header || 'Ref.: ' || (v_delivery->>'reference') || E'\n';
    end if;
  end if;
  v_header := v_header || repeat('-', 32) || E'\n';

  for v_item in
    select value from jsonb_array_elements(coalesce(new.payload->'items', '[]'::jsonb))
  loop
    v_item_line :=
      coalesce(v_item->>'qty', '1') || 'x ' || upper(coalesce(v_item->>'name', 'ITEM')) || E'\n';
    if nullif(v_item->>'detail', '') is not null then
      v_item_line := v_item_line || '   ' || (v_item->>'detail') || E'\n';
    end if;
    v_all_items := v_all_items || v_item_line;

    select product.value->>'category'
      into v_item_category
    from jsonb_array_elements(v_catalog) product
    where product.value->>'id' = v_item->>'productId'
    limit 1;

    if lower(coalesce(v_item_category, '')) like '%espet%' then
      v_skewer_items := v_skewer_items || v_item_line;
      v_skewer_count := v_skewer_count + 1;
    else
      v_side_items := v_side_items || v_item_line;
      v_side_count := v_side_count + 1;
    end if;
    v_item_category := null;
  end loop;

  v_footer :=
    repeat('-', 32) || E'\n' ||
    'TOTAL: R$ ' || replace(coalesce(new.payload->>'total', '0'), '.', ',') || E'\n' ||
    'Pagamento: ' || upper(coalesce(v_delivery->>'payment', '')) || E'\n';
  if nullif(v_delivery->>'notes', '') is not null then
    v_footer := v_footer ||
      repeat('-', 32) || E'\n' ||
      'OBS.: ' || upper(v_delivery->>'notes') || E'\n';
  end if;

  v_body := v_header || v_all_items || v_footer;
  v_ticket :=
    decode('1b401b61011b4501','hex') ||
    convert_to(
      case when v_fulfillment='delivery' then 'PEDIDO DELIVERY' else 'PEDIDO RETIRADA' end || E'\n',
      'UTF8'
    ) ||
    decode('1b45001b6100','hex') ||
    convert_to(v_body || E'\n\n\n','UTF8') ||
    decode('1d5600','hex');

  if v_skewer_count > 0 then
    v_skewer_ticket :=
      decode('1b401b61011b4501','hex') ||
      convert_to('PEDIDO - ESPETINHOS' || E'\n','UTF8') ||
      decode('1b45001b6100','hex') ||
      convert_to(v_header || v_skewer_items || v_footer || E'\n\n\n','UTF8') ||
      decode('1d5600','hex');
    v_routes := jsonb_set(v_routes, '{skewers}', jsonb_build_object(
      'data', encode(v_skewer_ticket, 'base64'),
      'itemCount', v_skewer_count
    ), true);
  end if;

  if v_side_count > 0 then
    v_side_ticket :=
      decode('1b401b61011b4501','hex') ||
      convert_to('PEDIDO - ACOMPANHAMENTOS' || E'\n','UTF8') ||
      decode('1b45001b6100','hex') ||
      convert_to(v_header || v_side_items || v_footer || E'\n\n\n','UTF8') ||
      decode('1d5600','hex');
    v_routes := jsonb_set(v_routes, '{sides}', jsonb_build_object(
      'data', encode(v_side_ticket, 'base64'),
      'itemCount', v_side_count
    ), true);
  end if;

  insert into public.print_jobs (tenant_id, command_id, job_kind, payload)
  values (
    new.tenant_id,
    new.id,
    'new_order',
    jsonb_build_object(
      'data', encode(v_ticket, 'base64'),
      'routes', v_routes,
      'items', coalesce(new.payload->'items', '[]'::jsonb),
      'customer', new.payload->>'name',
      'total', coalesce((new.payload->>'total')::numeric, 0),
      'source', 'delivery',
      'createdAt', floor(extract(epoch from clock_timestamp()) * 1000)
    )
  )
  on conflict (tenant_id, command_id, job_kind) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
