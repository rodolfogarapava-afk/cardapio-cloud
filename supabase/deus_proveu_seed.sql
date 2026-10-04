-- Catalog baseline for the only tenant being migrated to the new free project.
-- The upserts keep the operation repeatable and preserve future edits to row IDs.
with tenant_row as (
  insert into public.tenants (
    name,
    slug,
    delivery_enabled,
    subscription_status,
    owner_name,
    plan,
    monthly_fee,
    due_date,
    printer_status
  )
  values (
    'Deus Proveu Espetos',
    'proveu-espeto',
    true,
    'active',
    'Deus Proveu',
    'Gratuito',
    0,
    null,
    'offline'
  )
  on conflict (slug) do update
    set name = excluded.name,
        delivery_enabled = excluded.delivery_enabled,
        subscription_status = excluded.subscription_status,
        owner_name = excluded.owner_name,
        plan = excluded.plan,
        monthly_fee = excluded.monthly_fee,
        printer_status = excluded.printer_status
  returning id
)
insert into public.restaurant_catalogs (tenant_id, products, categories, updated_at)
select
  id,
  $$[
    {"id":9,"category":"Espetinhos","name":"Carne","price":11,"image":"/products/generated/espeto-carne.webp","description":"Espetinho de carne preparado na brasa e servido no ponto escolhido.","stock":30,"minStock":8,"trackStock":true,"preparationPointEnabled":true},
    {"id":12,"category":"Espetinhos","name":"Linguiça","price":10,"image":"/products/generated/espeto-linguica.webp","description":"Espetinho de linguiça assada na brasa, dourada e suculenta.","stock":30,"minStock":8,"trackStock":true},
    {"id":11,"category":"Espetinhos","name":"Frango com Bacon","price":12,"image":"/products/generated/espeto-frango-bacon.webp","description":"Cubos de frango com bacon, grelhados até ficarem dourados e suculentos.","stock":30,"minStock":8,"trackStock":true,"preparationPointEnabled":true},
    {"id":10,"category":"Espetinhos","name":"Carne com Bacon","price":14,"tag":"DESTAQUE","image":"/products/generated/espeto-carne-bacon.webp","description":"Espetinho de carne intercalada com bacon, assado na brasa.","stock":30,"minStock":8,"trackStock":true,"preparationPointEnabled":true},
    {"id":24,"category":"Espetinhos","name":"Meio da Asa","price":12,"image":"","description":"Meio da asa temperado e assado na brasa.","stock":30,"minStock":8,"trackStock":true},
    {"id":20,"category":"Acompanhamentos","name":"Farofa","price":3,"image":"","description":"Farofa crocante da casa.","stock":40,"minStock":10,"trackStock":true},
    {"id":21,"category":"Acompanhamentos","name":"Molho Verde","price":3,"image":"","description":"Molho verde fresco da casa.","stock":40,"minStock":10,"trackStock":true},
    {"id":22,"category":"Acompanhamentos","name":"Vinagrete","price":5,"image":"","description":"Vinagrete tradicional bem temperado.","stock":40,"minStock":10,"trackStock":true},
    {"id":23,"category":"Acompanhamentos","name":"Arroz","price":5,"image":"","description":"Porção de arroz soltinho.","stock":40,"minStock":10,"trackStock":true},
    {"id":14,"category":"Bebidas","name":"Água s/ Gás","price":3,"image":"/products/generated/agua-sem-gas.webp","description":"Água mineral sem gás, gelada.","stock":30,"minStock":8,"trackStock":true},
    {"id":13,"category":"Bebidas","name":"Água c/ Gás","price":4,"image":"/products/generated/agua-com-gas.webp","description":"Água mineral com gás, gelada.","stock":30,"minStock":8,"trackStock":true},
    {"id":18,"category":"Bebidas","name":"Fanta Lata","price":6,"image":"/products/generated/fanta-lata.webp","description":"Refrigerante Fanta em lata, servido gelado.","stock":30,"minStock":8,"trackStock":true},
    {"id":19,"category":"Bebidas","name":"Guaraná Lata","price":6,"image":"/products/generated/guarana-lata.webp","description":"Refrigerante Guaraná em lata, servido gelado.","stock":30,"minStock":8,"trackStock":true},
    {"id":17,"category":"Bebidas","name":"Coca Cola Lata","price":6,"image":"/products/generated/coca-cola-lata.webp","description":"Refrigerante Coca-Cola em lata, servido gelado.","stock":30,"minStock":8,"trackStock":true},
    {"id":16,"category":"Bebidas","name":"Coca Cola 1L","price":10,"image":"/products/generated/coca-cola-1l.webp","description":"Refrigerante Coca-Cola 1 litro, servido gelado.","stock":20,"minStock":5,"trackStock":true},
    {"id":15,"category":"Bebidas","name":"Coca Cola 1,5L","price":12,"image":"/products/generated/coca-cola-15l.webp","description":"Refrigerante Coca-Cola 1,5 litro, servido gelado.","stock":20,"minStock":5,"trackStock":true}
  ]$$::jsonb,
  '["Espetinhos","Acompanhamentos","Bebidas"]'::jsonb,
  now()
from tenant_row
on conflict (tenant_id) do update
  set products = excluded.products,
      categories = excluded.categories,
      updated_at = excluded.updated_at;
