-- Acesso seguro do administrador da plataforma às credenciais do cliente.
create or replace function public.get_client_access(client_tenant_id uuid)
returns table(user_id uuid,email text)
language plpgsql security definer set search_path=public,auth
as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  return query
    select users.id,users.email::text
    from public.tenant_memberships membership
    join auth.users users on users.id=membership.user_id
    where membership.tenant_id=client_tenant_id
    order by case when membership.role='owner' then 0 else 1 end
    limit 1;
end;
$$;

create or replace function public.update_client_access(
  client_tenant_id uuid,new_email text,new_password text default null
) returns void
language plpgsql security definer set search_path=public,auth,extensions
as $$
declare client_user_id uuid; normalized_email text:=lower(trim(new_email));
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if normalized_email='' then raise exception 'Informe um e-mail válido'; end if;
  if new_password is not null and new_password<>'' and length(new_password)<6 then
    raise exception 'A nova senha deve ter pelo menos 6 caracteres';
  end if;
  select membership.user_id into client_user_id
  from public.tenant_memberships membership
  where membership.tenant_id=client_tenant_id
  order by case when membership.role='owner' then 0 else 1 end limit 1;
  if client_user_id is null then raise exception 'A loja não possui usuário responsável'; end if;
  if exists(select 1 from auth.users where lower(email)=normalized_email and id<>client_user_id) then
    raise exception 'Este e-mail já está cadastrado';
  end if;
  update auth.users set
    email=normalized_email,
    encrypted_password=case when coalesce(new_password,'')='' then encrypted_password else crypt(new_password,gen_salt('bf')) end,
    email_confirmed_at=coalesce(email_confirmed_at,now()),
    updated_at=now()
  where id=client_user_id;
  update auth.identities set
    identity_data=jsonb_set(identity_data,'{email}',to_jsonb(normalized_email),true),
    updated_at=now()
  where user_id=client_user_id and provider='email';
end;
$$;

revoke all on function public.get_client_access(uuid) from public;
revoke all on function public.update_client_access(uuid,text,text) from public;
grant execute on function public.get_client_access(uuid) to authenticated;
grant execute on function public.update_client_access(uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
