create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_role() to anon;
