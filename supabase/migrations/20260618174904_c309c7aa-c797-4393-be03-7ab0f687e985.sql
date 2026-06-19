
-- Pin search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.phone);
  insert into public.user_roles (user_id, role) values (new.id, 'citizen');
  return new;
end $$;

-- Restrict execute on SECURITY DEFINER helpers
revoke execute on function public.has_role(uuid, app_role) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;

revoke execute on function public.match_kb_chunks(vector, int) from public, anon;
grant execute on function public.match_kb_chunks(vector, int) to authenticated, service_role;
