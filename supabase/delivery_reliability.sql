-- Delivery reliability and multi-tenant isolation.
-- Safe to run more than once.

alter table public.tenants
  add column if not exists delivery_fee numeric(12,2) not null default 3.90;

create table if not exists public.delivery_orders (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id bigint not null,
  request_id uuid not null,
  phone text not null,
  status text not null default 'new'
    check (status in ('new','preparing','ready','completed','cancelled')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (tenant_id,id),
  unique (tenant_id,request_id)
);

create index if not exists delivery_orders_customer_idx
  on public.delivery_orders (tenant_id,phone,created_at desc);

alter table public.delivery_orders enable row level security;

insert into public.delivery_orders(
  tenant_id,id,request_id,phone,status,payload,created_at,updated_at
)
select command.tenant_id,command.id,
  md5(command.tenant_id::text||':'||command.id::text)::uuid,
  regexp_replace(coalesce(command.payload->'delivery'->>'phone',''),'\D','','g'),
  case coalesce(command.payload->>'kitchenStatus','new')
    when 'preparing' then 'preparing'
    when 'ready' then 'ready'
    else 'new' end,
  command.payload,to_timestamp(command.id/1000.0),command.updated_at
from public.restaurant_commands command
where command.payload ? 'delivery'
  and length(regexp_replace(coalesce(command.payload->'delivery'->>'phone',''),'\D','','g')) in (10,11)
on conflict(tenant_id,id) do nothing;

drop policy if exists "members read delivery orders" on public.delivery_orders;
create policy "members read delivery orders"
  on public.delivery_orders for select to authenticated
  using (exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id=delivery_orders.tenant_id
      and membership.user_id=(select auth.uid())
  ));

create or replace function public.get_public_menu(p_slug text)
returns jsonb language sql stable security definer
set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'tenantId',tenant.id,
    'tenantName',tenant.name,
    'slug',tenant.slug,
    'deliveryFee',tenant.delivery_fee,
    'products',coalesce(catalog.products,'[]'::jsonb),
    'categories',coalesce(catalog.categories,'[]'::jsonb)
  )
  from public.tenants tenant
  left join public.restaurant_catalogs catalog on catalog.tenant_id=tenant.id
  where tenant.slug=lower(trim(p_slug))
    and tenant.delivery_enabled=true
    and tenant.subscription_status in ('active','trial','past_due')
  limit 1
$$;

create or replace function public.submit_public_order(
  p_tenant_id uuid,p_customer jsonb,p_order jsonb
) returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $$
declare
  v_phone text:=regexp_replace(coalesce(p_customer->>'phone',''),'\D','','g');
  v_name text:=trim(coalesce(p_customer->>'name',''));
  v_request_id uuid;
  v_existing bigint;
  v_id bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_requested jsonb;
  v_product jsonb;
  v_catalog jsonb;
  v_updated_products jsonb:='[]'::jsonb;
  v_validated_items jsonb:='[]'::jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_reserved integer;
  v_price numeric;
  v_stock integer;
  v_track_stock boolean;
  v_count integer:=0;
  v_subtotal numeric:=0;
  v_delivery_fee numeric:=0;
  v_total numeric:=0;
  v_fulfillment text:=lower(coalesce(p_order->>'fulfillment','delivery'));
  v_payload jsonb;
begin
  begin
    v_request_id:=(p_order->>'requestId')::uuid;
  exception when others then
    raise exception 'Identificador do pedido inválido';
  end;

  select case when v_fulfillment='delivery' then tenant.delivery_fee else 0 end
    into v_delivery_fee
  from public.tenants tenant
  where tenant.id=p_tenant_id
    and tenant.delivery_enabled=true
    and tenant.subscription_status in ('active','trial','past_due');

  if not found then raise exception 'Loja indisponível para pedidos'; end if;
  select products into v_catalog from public.restaurant_catalogs
  where tenant_id=p_tenant_id for update;
  v_catalog:=coalesce(v_catalog,'[]'::jsonb);
  if length(v_phone) not in (10,11) or v_name='' then
    raise exception 'Cliente inválido';
  end if;
  if v_fulfillment not in ('delivery','pickup') then
    raise exception 'Forma de recebimento inválida';
  end if;

  select orders.id into v_existing
  from public.delivery_orders orders
  where orders.tenant_id=p_tenant_id and orders.request_id=v_request_id;
  if v_existing is not null then
    return jsonb_build_object('id',v_existing,'status','existing');
  end if;

  if jsonb_typeof(p_order->'items')<>'array'
     or jsonb_array_length(p_order->'items')=0 then
    raise exception 'Pedido sem itens';
  end if;

  for v_requested in select value from jsonb_array_elements(p_order->'items')
  loop
    v_product_id:=coalesce(v_requested->>'productId','');
    begin
      v_qty:=(v_requested->>'qty')::integer;
    exception when others then
      raise exception 'Quantidade inválida';
    end;
    if v_qty<1 or v_qty>99 then raise exception 'Quantidade inválida'; end if;

    select value into v_product
    from jsonb_array_elements(v_catalog) product
    where product.value->>'id'=v_product_id
    limit 1;
    if v_product is null then raise exception 'Produto não encontrado'; end if;

    begin
      v_price:=coalesce((v_product->>'price')::numeric,0);
      v_track_stock:=coalesce((v_product->>'trackStock')::boolean,true);
      v_stock:=coalesce((v_product->>'stock')::integer,0);
    exception when others then
      raise exception 'Cadastro inválido do produto %',coalesce(v_product->>'name',v_product_id);
    end;
    if v_price<0 then raise exception 'Preço inválido'; end if;
    if v_track_stock and v_stock<v_qty then
      raise exception 'Estoque insuficiente para %',v_product->>'name';
    end if;

    v_count:=v_count+v_qty;
    v_subtotal:=v_subtotal+(v_price*v_qty);
    v_validated_items:=v_validated_items||jsonb_build_array(
      jsonb_build_object(
        'productId',v_product_id,
        'name',v_product->>'name',
        'qty',v_qty,
        'price',v_price,
        'detail',left(coalesce(v_requested->>'detail',''),500),
        'delivered',false
      )
    );
    v_product:=null;
  end loop;

  for v_product in select value from jsonb_array_elements(v_catalog)
  loop
    select coalesce(sum((item->>'qty')::integer),0) into v_reserved
    from jsonb_array_elements(v_validated_items) item
    where item->>'productId'=v_product->>'id';
    if v_reserved>0 and coalesce((v_product->>'trackStock')::boolean,true) then
      v_product:=jsonb_set(
        v_product,'{stock}',
        to_jsonb(greatest(0,coalesce((v_product->>'stock')::integer,0)-v_reserved))
      );
    end if;
    v_updated_products:=v_updated_products||jsonb_build_array(v_product);
  end loop;

  v_total:=round(v_subtotal+v_delivery_fee,2);
  while exists (
    select 1 from public.restaurant_commands
    where tenant_id=p_tenant_id and id=v_id
  ) loop v_id:=v_id+1; end loop;

  v_payload:=jsonb_build_object(
    'id',v_id,'name',v_name,'count',v_count,'total',v_total,
    'createdAt',v_id,'kitchenStatus','new','items',v_validated_items,
    'delivery',jsonb_build_object(
      'phone',v_phone,'fulfillment',v_fulfillment,
      'payment',coalesce(p_order->>'payment',''),
      'street',coalesce(p_customer->>'street',''),
      'number',coalesce(p_customer->>'number',''),
      'neighborhood',coalesce(p_customer->>'neighborhood',''),
      'reference',coalesce(p_customer->>'reference',''),
      'latitude',p_customer->'latitude','longitude',p_customer->'longitude',
      'notes',left(coalesce(p_order->>'notes',''),500),
      'subtotal',v_subtotal,'deliveryFee',v_delivery_fee,
      'requestId',v_request_id,'inventoryReserved',true
    )
  );

  update public.restaurant_catalogs
    set products=v_updated_products,updated_at=now()
    where tenant_id=p_tenant_id;

  insert into public.delivery_customers(
    tenant_id,phone,name,street,number,neighborhood,reference,
    latitude,longitude,updated_at
  ) values (
    p_tenant_id,v_phone,v_name,coalesce(p_customer->>'street',''),
    coalesce(p_customer->>'number',''),coalesce(p_customer->>'neighborhood',''),
    coalesce(p_customer->>'reference',''),
    nullif(p_customer->>'latitude','')::double precision,
    nullif(p_customer->>'longitude','')::double precision,now()
  ) on conflict(tenant_id,phone) do update set
    name=excluded.name,street=excluded.street,number=excluded.number,
    neighborhood=excluded.neighborhood,reference=excluded.reference,
    latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();

  insert into public.delivery_orders(
    tenant_id,id,request_id,phone,status,payload,created_at,updated_at
  ) values (
    p_tenant_id,v_id,v_request_id,v_phone,'new',v_payload,now(),now()
  );

  -- The delivery print trigger runs as part of this same transaction.
  insert into public.restaurant_commands(tenant_id,id,payload,updated_at)
  values(p_tenant_id,v_id,v_payload,now());

  return jsonb_build_object(
    'id',v_id,'status','created','total',v_total,
    'subtotal',v_subtotal,'deliveryFee',v_delivery_fee
  );
exception when unique_violation then
  select orders.id into v_existing from public.delivery_orders orders
  where orders.tenant_id=p_tenant_id and orders.request_id=v_request_id;
  if v_existing is not null then
    return jsonb_build_object('id',v_existing,'status','existing');
  end if;
  raise;
end
$$;

create or replace function public.sync_delivery_order_from_command()
returns trigger language plpgsql security definer
set search_path=public,pg_temp as $$
begin
  if new.payload ? 'delivery' then
    update public.delivery_orders
    set status=case coalesce(new.payload->>'kitchenStatus','new')
      when 'preparing' then 'preparing'
      when 'ready' then 'ready'
      else 'new' end,
      payload=new.payload,updated_at=now()
    where tenant_id=new.tenant_id and id=new.id
      and status not in ('completed','cancelled');
  end if;
  return new;
end
$$;

drop trigger if exists restaurant_commands_delivery_status on public.restaurant_commands;
create trigger restaurant_commands_delivery_status
after update of payload on public.restaurant_commands
for each row execute function public.sync_delivery_order_from_command();

create or replace function public.get_public_order_status(
  p_tenant_id uuid,p_order_id bigint,p_phone text
) returns jsonb language sql stable security definer
set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'id',orders.id,'kitchenStatus',orders.status,
    'updatedAt',orders.updated_at,'completedAt',orders.completed_at
  )
  from public.delivery_orders orders
  where orders.tenant_id=p_tenant_id and orders.id=p_order_id
    and orders.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
  limit 1
$$;

create or replace function public.get_public_customer_orders(
  p_tenant_id uuid,p_phone text
) returns jsonb language sql stable security definer
set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',orders.id,'status',orders.status,'payload',orders.payload,
      'createdAt',orders.created_at,'updatedAt',orders.updated_at
    ) order by orders.created_at desc
  ),'[]'::jsonb)
  from public.delivery_orders orders
  where orders.tenant_id=p_tenant_id
    and orders.phone=regexp_replace(coalesce(p_phone,''),'\D','','g')
$$;

create or replace function public.finalize_restaurant_command(
  p_command_id bigint,p_payment_method text
) returns boolean language plpgsql security definer
set search_path=public,pg_temp as $$
declare v_tenant uuid; v_payload jsonb;
begin
  select membership.tenant_id into v_tenant
  from public.tenant_memberships membership
  where membership.user_id=(select auth.uid()) limit 1;
  if v_tenant is null then raise exception 'Loja não encontrada'; end if;

  select command.payload into v_payload
  from public.restaurant_commands command
  where command.tenant_id=v_tenant and command.id=p_command_id for update;
  if v_payload is null then return false; end if;

  insert into public.restaurant_sales(
    tenant_id,id,customer_name,amount,payment_method,sold_at,payload,updated_at
  ) values (
    v_tenant,p_command_id,coalesce(v_payload->>'name','Cliente'),
    coalesce((v_payload->>'total')::numeric,0),coalesce(nullif(p_payment_method,''),'Não informado'),
    now(),jsonb_build_object(
      'id',p_command_id,'name',coalesce(v_payload->>'name','Cliente'),
      'total',coalesce((v_payload->>'total')::numeric,0),
      'method',coalesce(nullif(p_payment_method,''),'Não informado'),
      'createdAt',floor(extract(epoch from now())*1000)::bigint,
      'items',coalesce(v_payload->'items','[]'::jsonb)
    ),now()
  ) on conflict(tenant_id,id) do nothing;

  update public.delivery_orders set status='completed',completed_at=now(),updated_at=now()
  where tenant_id=v_tenant and id=p_command_id;
  delete from public.restaurant_commands
  where tenant_id=v_tenant and id=p_command_id;
  return true;
end
$$;

create or replace function public.cancel_restaurant_command(p_command_id bigint)
returns boolean language plpgsql security definer
set search_path=public,pg_temp as $$
declare
  v_tenant uuid; v_payload jsonb; v_products jsonb; v_updated jsonb:='[]'::jsonb;
  v_product jsonb; v_qty integer;
begin
  select membership.tenant_id into v_tenant
  from public.tenant_memberships membership
  where membership.user_id=(select auth.uid()) limit 1;
  if v_tenant is null then raise exception 'Loja não encontrada'; end if;
  select command.payload into v_payload from public.restaurant_commands command
  where command.tenant_id=v_tenant and command.id=p_command_id for update;
  if v_payload is null then return false; end if;

  if coalesce((v_payload->'delivery'->>'inventoryReserved')::boolean,false) then
    select products into v_products from public.restaurant_catalogs
    where tenant_id=v_tenant for update;
    for v_product in select value from jsonb_array_elements(coalesce(v_products,'[]'::jsonb))
    loop
      select coalesce(sum((item->>'qty')::integer),0) into v_qty
      from jsonb_array_elements(coalesce(v_payload->'items','[]'::jsonb)) item
      where item->>'productId'=v_product->>'id';
      if v_qty>0 and coalesce((v_product->>'trackStock')::boolean,true) then
        v_product:=jsonb_set(
          v_product,'{stock}',to_jsonb(coalesce((v_product->>'stock')::integer,0)+v_qty)
        );
      end if;
      v_updated:=v_updated||jsonb_build_array(v_product);
    end loop;
    update public.restaurant_catalogs set products=v_updated,updated_at=now()
    where tenant_id=v_tenant;
  end if;

  update public.delivery_orders set status='cancelled',completed_at=now(),updated_at=now()
  where tenant_id=v_tenant and id=p_command_id;
  delete from public.restaurant_commands where tenant_id=v_tenant and id=p_command_id;
  return true;
end
$$;

create or replace function public.claim_print_jobs(p_token text,p_limit integer default 5)
returns table(job_id uuid,payload jsonb)
language plpgsql security definer set search_path=public,extensions as $$
declare v_agent uuid; v_tenant uuid;
begin
  select id,tenant_id into v_agent,v_tenant from public.printer_agents
  where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null;
  if v_agent is null then raise exception 'Agente não autorizado'; end if;

  update public.print_jobs set
    status='failed',claimed_by=null,claimed_at=null,
    error_message='Impressão retomada após interrupção do agente'
  where tenant_id=v_tenant and status='processing'
    and claimed_at<now()-interval '2 minutes' and attempts<5;

  return query
  with candidates as (
    select id from public.print_jobs
    where tenant_id=v_tenant
      and (status='pending' or (status='failed' and attempts<5))
    order by created_at for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  ),claimed as (
    update public.print_jobs jobs set
      status='processing',claimed_by=v_agent,claimed_at=now(),
      attempts=jobs.attempts+1,error_message=null
    from candidates where jobs.id=candidates.id
    returning jobs.id,jobs.payload
  )
  select claimed.id,claimed.payload from claimed;
end
$$;

revoke all on function public.get_public_customer_orders(uuid,text) from public;
revoke all on function public.finalize_restaurant_command(bigint,text) from public;
revoke all on function public.cancel_restaurant_command(bigint) from public;
grant execute on function public.get_public_customer_orders(uuid,text) to anon,authenticated;
grant execute on function public.finalize_restaurant_command(bigint,text) to authenticated;
grant execute on function public.cancel_restaurant_command(bigint) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.delivery_orders;
exception when duplicate_object then null;
end $$;

notify pgrst,'reload schema';
