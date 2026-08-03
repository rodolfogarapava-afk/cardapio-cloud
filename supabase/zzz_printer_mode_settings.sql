-- Configuracao de impressao por loja.
-- single: envia a comanda completa uma unica vez para a impressora escolhida.
-- split: divide os itens conforme as categorias destinadas a impressora 1.

create table if not exists public.tenant_printer_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  mode text not null default 'single' check (mode in ('single','split')),
  single_printer smallint not null default 1 check (single_printer in (1,2)),
  printer_one_categories text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.tenant_printer_settings (tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;

-- Toda loja criada futuramente ja nasce com o modo seguro de uma impressora.
create or replace function public.initialize_tenant_printer_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.tenant_printer_settings (tenant_id, mode, single_printer)
  values (new.id, 'single', 1)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tenants_initialize_printer_settings on public.tenants;
create trigger tenants_initialize_printer_settings
after insert on public.tenants
for each row execute function public.initialize_tenant_printer_settings();

alter table public.tenant_printer_settings enable row level security;

drop policy if exists "members manage printer settings" on public.tenant_printer_settings;
create policy "members manage printer settings"
  on public.tenant_printer_settings for all to authenticated
  using (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships membership
      where membership.tenant_id = tenant_printer_settings.tenant_id
        and membership.user_id = (select auth.uid())
    )
  )
  with check (
    public.is_platform_admin() or exists (
      select 1 from public.tenant_memberships membership
      where membership.tenant_id = tenant_printer_settings.tenant_id
        and membership.user_id = (select auth.uid())
    )
  );

grant select,insert,update,delete on public.tenant_printer_settings to authenticated;

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
  v_printer_one_items text := '';
  v_printer_two_items text := '';
  v_printer_one_count integer := 0;
  v_printer_two_count integer := 0;
  v_body text;
  v_ticket bytea;
  v_printer_one_ticket bytea;
  v_printer_two_ticket bytea;
  v_printer_one_route jsonb;
  v_printer_two_route jsonb;
  v_routes jsonb := '{}'::jsonb;
  v_fulfillment text := coalesce(v_delivery->>'fulfillment', 'delivery');
  v_mode text := 'single';
  v_single_printer smallint := 1;
  v_printer_one_categories text[] := '{}';
begin
  if v_delivery is null or jsonb_typeof(v_delivery) <> 'object' then
    return new;
  end if;

  select settings.mode, settings.single_printer, settings.printer_one_categories
    into v_mode, v_single_printer, v_printer_one_categories
  from public.tenant_printer_settings settings
  where settings.tenant_id = new.tenant_id;
  if not found then
    v_mode := 'single';
    v_single_printer := 1;
    v_printer_one_categories := '{}';
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
      'ENTREGA: ' || concat_ws(', ', nullif(v_delivery->>'street', ''), nullif(v_delivery->>'number', '')) || E'\n' ||
      'Bairro: ' || coalesce(v_delivery->>'neighborhood', '') || E'\n';
    if nullif(v_delivery->>'reference', '') is not null then
      v_header := v_header || 'Ref.: ' || (v_delivery->>'reference') || E'\n';
    end if;
  end if;
  v_header := v_header || repeat('-', 32) || E'\n';

  for v_item in
    select value from jsonb_array_elements(coalesce(new.payload->'items', '[]'::jsonb))
  loop
    v_item_line := coalesce(v_item->>'qty', '1') || 'x ' || upper(coalesce(v_item->>'name', 'ITEM')) || E'\n';
    if nullif(v_item->>'detail', '') is not null then
      v_item_line := v_item_line || '   ' || (v_item->>'detail') || E'\n';
    end if;
    v_all_items := v_all_items || v_item_line;

    select product.value->>'category'
      into v_item_category
    from jsonb_array_elements(v_catalog) product
    where product.value->>'id' = v_item->>'productId'
    limit 1;
    v_item_category := coalesce(v_item_category, v_item->>'category', '');

    if exists (
      select 1 from unnest(v_printer_one_categories) selected(category)
      where lower(trim(selected.category)) = lower(trim(v_item_category))
    ) then
      v_printer_one_items := v_printer_one_items || v_item_line;
      v_printer_one_count := v_printer_one_count + 1;
    else
      v_printer_two_items := v_printer_two_items || v_item_line;
      v_printer_two_count := v_printer_two_count + 1;
    end if;
    v_item_category := null;
  end loop;

  v_footer :=
    repeat('-', 32) || E'\n' ||
    'TOTAL: R$ ' || replace(coalesce(new.payload->>'total', '0'), '.', ',') || E'\n' ||
    'Pagamento: ' || upper(coalesce(v_delivery->>'payment', '')) || E'\n';
  if nullif(v_delivery->>'notes', '') is not null then
    v_footer := v_footer || repeat('-', 32) || E'\n' || 'OBS.: ' || upper(v_delivery->>'notes') || E'\n';
  end if;

  v_body := v_header || v_all_items || v_footer;
  v_ticket :=
    decode('1b401b61011b4501','hex') ||
    convert_to(case when v_fulfillment='delivery' then 'PEDIDO DELIVERY' else 'PEDIDO RETIRADA' end || E'\n','UTF8') ||
    decode('1b45001b6100','hex') || convert_to(v_body || E'\n\n\n','UTF8') || decode('1d5600','hex');

  if v_printer_one_count > 0 then
    v_printer_one_ticket :=
      decode('1b401b61011b4501','hex') || convert_to('PEDIDO - IMPRESSORA 1' || E'\n','UTF8') ||
      decode('1b45001b6100','hex') || convert_to(v_header || v_printer_one_items || v_footer || E'\n\n\n','UTF8') || decode('1d5600','hex');
    v_printer_one_route := jsonb_build_object('data', encode(v_printer_one_ticket, 'base64'), 'itemCount', v_printer_one_count);
    v_routes := jsonb_set(v_routes, '{printer1}', v_printer_one_route, true);
    v_routes := jsonb_set(v_routes, '{skewers}', v_printer_one_route, true);
  end if;

  if v_printer_two_count > 0 then
    v_printer_two_ticket :=
      decode('1b401b61011b4501','hex') || convert_to('PEDIDO - IMPRESSORA 2' || E'\n','UTF8') ||
      decode('1b45001b6100','hex') || convert_to(v_header || v_printer_two_items || v_footer || E'\n\n\n','UTF8') || decode('1d5600','hex');
    v_printer_two_route := jsonb_build_object('data', encode(v_printer_two_ticket, 'base64'), 'itemCount', v_printer_two_count);
    v_routes := jsonb_set(v_routes, '{printer2}', v_printer_two_route, true);
    v_routes := jsonb_set(v_routes, '{sides}', v_printer_two_route, true);
  end if;

  insert into public.print_jobs (tenant_id, command_id, job_kind, payload)
  values (
    new.tenant_id,
    new.id,
    'new_order',
    jsonb_build_object(
      'data', encode(v_ticket, 'base64'),
      'routes', v_routes,
      'routingMode', v_mode,
      'singlePrinter', v_single_printer,
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
