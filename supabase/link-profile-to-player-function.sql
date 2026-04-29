create or replace function public.link_profile_to_player_by_email(
  p_player_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set player_id = p_player_id
  where lower(trim(email)) = lower(trim(p_email))
    and player_id is null;
end;
$$;

revoke all on function public.link_profile_to_player_by_email(uuid, text) from public;
grant execute on function public.link_profile_to_player_by_email(uuid, text) to anon, authenticated;
