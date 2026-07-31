-- Impressão automática dos pedidos públicos do delivery.
-- O gatilho roda no banco, na mesma transação que cria a comanda, portanto
-- não depende do telefone permanecer aberto após confirmar o pedido.

create or replace function public.queue_delivery_order_print()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery jsonb := new.payload->'delivery';
  v_item jsonb;
  v_body text;
  v_ticket bytea;
  v_fulfillment text := coalesce(v_delivery->>'fulfillment', 'delivery');
begin
  -- Comandas presenciais não possuem o objeto delivery e continuam usando
  -- o fluxo de impressão que já existe no painel da loja.
  if v_delivery is null or jsonb_typeof(v_delivery) <> 'object' then
    return new;
  end if;

  v_body :=
    'COMANDA #' || right(new.id::text, 6) || E'\n' ||
    to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || E'\n' ||
    repeat('-', 32) || E'\n' ||
    'Cliente: ' || coalesce(new.payload->>'name', '') || E'\n' ||
    'Telefone: ' || coalesce(v_delivery->>'phone', '') || E'\n';

  if v_fulfillment = 'delivery' then
    v_body := v_body ||
      'ENTREGA: ' || concat_ws(', ',
        nullif(v_delivery->>'street', ''),
        nullif(v_delivery->>'number', '')
      ) || E'\n' ||
      'Bairro: ' || coalesce(v_delivery->>'neighborhood', '') || E'\n';
    if nullif(v_delivery->>'reference', '') is not null then
      v_body := v_body || 'Ref.: ' || (v_delivery->>'reference') || E'\n';
    end if;
  end if;

  v_body := v_body || repeat('-', 32) || E'\n';

  for v_item in
    select value from jsonb_array_elements(coalesce(new.payload->'items', '[]'::jsonb))
  loop
    v_body := v_body ||
      coalesce(v_item->>'qty', '1') || 'x ' || upper(coalesce(v_item->>'name', 'ITEM')) || E'\n';
    if nullif(v_item->>'detail', '') is not null then
      v_body := v_body || '   ' || (v_item->>'detail') || E'\n';
    end if;
  end loop;

  v_body := v_body ||
    repeat('-', 32) || E'\n' ||
    'TOTAL: R$ ' || replace(coalesce(new.payload->>'total', '0'), '.', ',') || E'\n' ||
    'Pagamento: ' || upper(coalesce(v_delivery->>'payment', '')) || E'\n';

  if nullif(v_delivery->>'notes', '') is not null then
    v_body := v_body ||
      repeat('-', 32) || E'\n' ||
      'OBS.: ' || upper(v_delivery->>'notes') || E'\n';
  end if;

  -- Controle ESC/POS em bytea. Bytes NUL não podem existir em valores text
  -- do PostgreSQL; montar tudo como bytea evita rejeitar o pedido.
  v_ticket :=
    decode('1b401b61011b4501','hex') ||
    convert_to(
      case when v_fulfillment='delivery' then 'PEDIDO DELIVERY' else 'PEDIDO RETIRADA' end || E'\n',
      'UTF8'
    ) ||
    decode('1b45001b6100','hex') ||
    convert_to(v_body || E'\n\n\n','UTF8') ||
    decode('1d5600','hex');

  insert into public.print_jobs (tenant_id, command_id, job_kind, payload)
  values (
    new.tenant_id,
    new.id,
    'new_order',
    jsonb_build_object(
      'data', encode(v_ticket, 'base64'),
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

drop trigger if exists restaurant_commands_delivery_print on public.restaurant_commands;
create trigger restaurant_commands_delivery_print
after insert on public.restaurant_commands
for each row
execute function public.queue_delivery_order_print();
