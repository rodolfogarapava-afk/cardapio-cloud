-- Bucket público para imagens do cardápio.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "members upload product images" on storage.objects;
create policy "members upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='product-images'
    and exists (
      select 1 from public.tenant_memberships membership
      where membership.user_id=(select auth.uid())
        and membership.tenant_id::text=(storage.foldername(name))[1]
    )
  );

drop policy if exists "members update product images" on storage.objects;
create policy "members update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id='product-images'
    and exists (
      select 1 from public.tenant_memberships membership
      where membership.user_id=(select auth.uid())
        and membership.tenant_id::text=(storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id='product-images'
    and exists (
      select 1 from public.tenant_memberships membership
      where membership.user_id=(select auth.uid())
        and membership.tenant_id::text=(storage.foldername(name))[1]
    )
  );

drop policy if exists "members delete product images" on storage.objects;
create policy "members delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id='product-images'
    and exists (
      select 1 from public.tenant_memberships membership
      where membership.user_id=(select auth.uid())
        and membership.tenant_id::text=(storage.foldername(name))[1]
    )
  );
