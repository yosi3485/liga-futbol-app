-- Permissions + Jornada lock (RLS)
-- Goal:
-- 1) Ensure authenticated/admin can write (grants + RLS policy assumptions).
-- 2) Prevent editing jornada_attendance once jornada is closed.
--
-- Run AFTER:
-- - profiles table exists
-- - public.is_admin() exists
-- - jornada_status table exists (see supabase/jornada-status.sql)

-- Minimal GRANTS (safe to re-run)
grant usage on schema public to anon, authenticated;

grant select on table public.teams to anon, authenticated;
grant select on table public.players to anon, authenticated;
grant select on table public.matches to anon, authenticated;
grant select on table public.match_players to anon, authenticated;
grant select on table public.player_match_stats to anon, authenticated;
grant select on table public.jornada_attendance to anon, authenticated;
grant select on table public.match_attendance to anon, authenticated;
grant select on table public.jornada_mvp_votes to anon, authenticated;
grant select on table public.jornada_status to anon, authenticated;

-- Writes should be authenticated only (and RLS decides which rows)
grant insert, update, delete on table public.teams to authenticated;
grant insert, update, delete on table public.players to authenticated;
grant insert, update, delete on table public.matches to authenticated;
grant insert, update, delete on table public.match_players to authenticated;
grant insert, update, delete on table public.player_match_stats to authenticated;
grant insert, update, delete on table public.jornada_attendance to authenticated;
grant insert, update, delete on table public.match_attendance to authenticated;
grant insert, update, delete on table public.jornada_mvp_votes to authenticated;
grant insert, update, delete on table public.jornada_status to authenticated;

-- Helper: jornada is closed?
create or replace function public.is_jornada_closed(p_jornada_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select js.is_closed from public.jornada_status js where js.jornada_date = p_jornada_date),
    false
  );
$$;

revoke all on function public.is_jornada_closed(date) from public;
grant execute on function public.is_jornada_closed(date) to anon, authenticated;

-- Lock jornada attendance once closed:
-- Replace any existing "admin write jornada attendance" with one that checks jornada_status.
drop policy if exists "admin write jornada attendance" on public.jornada_attendance;
create policy "admin write jornada attendance"
on public.jornada_attendance
for all
to authenticated
using (public.is_admin() and not public.is_jornada_closed(jornada_date))
with check (public.is_admin() and not public.is_jornada_closed(jornada_date));

