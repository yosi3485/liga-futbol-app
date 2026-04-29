-- RLS hardening: replace anon write policies with authenticated + admin role checks.
-- Run after profiles + auth are already in place.

-- Helper: returns true when current authenticated user is admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Ensure RLS enabled
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.player_match_stats enable row level security;
alter table public.jornada_attendance enable row level security;
alter table public.match_attendance enable row level security;
alter table public.jornada_mvp_votes enable row level security;

-- Drop old dev anon policies (if exist)
drop policy if exists "dev anon read matches" on public.matches;
drop policy if exists "dev anon insert matches" on public.matches;
drop policy if exists "dev anon update matches" on public.matches;
drop policy if exists "dev anon delete matches" on public.matches;
drop policy if exists "dev anon read jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon insert jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon update jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon delete jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon read match attendance" on public.match_attendance;
drop policy if exists "dev anon insert match attendance" on public.match_attendance;
drop policy if exists "dev anon update match attendance" on public.match_attendance;
drop policy if exists "dev anon delete match attendance" on public.match_attendance;
drop policy if exists "dev anon read match players" on public.match_players;
drop policy if exists "dev anon insert match players" on public.match_players;
drop policy if exists "dev anon update match players" on public.match_players;
drop policy if exists "dev anon delete match players" on public.match_players;
drop policy if exists "dev anon read player match stats" on public.player_match_stats;
drop policy if exists "dev anon insert player match stats" on public.player_match_stats;
drop policy if exists "dev anon update player match stats" on public.player_match_stats;
drop policy if exists "dev anon delete player match stats" on public.player_match_stats;
drop policy if exists "dev anon read jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon insert jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon update jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon delete jornada mvp votes" on public.jornada_mvp_votes;

-- Also drop any prior auth-admin policies to make script re-runnable.
drop policy if exists "public read teams" on public.teams;
drop policy if exists "admin write teams" on public.teams;
drop policy if exists "public read players" on public.players;
drop policy if exists "admin write players" on public.players;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "admin write matches" on public.matches;
drop policy if exists "public read match players" on public.match_players;
drop policy if exists "admin write match players" on public.match_players;
drop policy if exists "public read player match stats" on public.player_match_stats;
drop policy if exists "admin write player match stats" on public.player_match_stats;
drop policy if exists "public read jornada attendance" on public.jornada_attendance;
drop policy if exists "admin write jornada attendance" on public.jornada_attendance;
drop policy if exists "public read match attendance" on public.match_attendance;
drop policy if exists "admin write match attendance" on public.match_attendance;
drop policy if exists "public read jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "authenticated insert own mvp vote" on public.jornada_mvp_votes;
drop policy if exists "admin manage jornada mvp votes" on public.jornada_mvp_votes;

-- Teams
create policy "public read teams" on public.teams
for select using (true);
create policy "admin write teams" on public.teams
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Players
create policy "public read players" on public.players
for select using (true);
create policy "admin write players" on public.players
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Matches
create policy "public read matches" on public.matches
for select using (true);
create policy "admin write matches" on public.matches
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Match players
create policy "public read match players" on public.match_players
for select using (true);
create policy "admin write match players" on public.match_players
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Player match stats
create policy "public read player match stats" on public.player_match_stats
for select using (true);
create policy "admin write player match stats" on public.player_match_stats
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Jornada attendance
create policy "public read jornada attendance" on public.jornada_attendance
for select using (true);
create policy "admin write jornada attendance" on public.jornada_attendance
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Match attendance
create policy "public read match attendance" on public.match_attendance
for select using (true);
create policy "admin write match attendance" on public.match_attendance
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- MVP votes: everyone can read, authenticated players can insert own vote key.
create policy "public read jornada mvp votes" on public.jornada_mvp_votes
for select using (true);

create policy "authenticated insert own mvp vote" on public.jornada_mvp_votes
for insert to authenticated
with check (
  voter_key = (
    select p.player_id::text
    from public.profiles p
    where p.id = auth.uid()
      and p.player_id is not null
  )
);

create policy "admin manage jornada mvp votes" on public.jornada_mvp_votes
for all to authenticated
using (public.is_admin())
with check (public.is_admin());
