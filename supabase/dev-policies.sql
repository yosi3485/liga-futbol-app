-- TEMP development policies for the anonymous client.
-- Replace these with authenticated admin-role policies before production.

create table if not exists public.match_attendance (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (match_id, player_id)
);

create table if not exists public.jornada_attendance (
    id uuid primary key default gen_random_uuid(),
    jornada_date date not null,
    player_id uuid not null references public.players(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (jornada_date, player_id)
);

create table if not exists public.jornada_mvp_votes (
    id uuid primary key default gen_random_uuid(),
    jornada_date date not null,
    player_id uuid not null references public.players(id) on delete cascade,
    voter_key text not null,
    created_at timestamptz not null default now(),
    unique (jornada_date, voter_key)
);

alter table public.players add column if not exists email text;

alter table public.matches
add column if not exists first_goal_team_id uuid null references public.teams(id);

alter table public.matches
add column if not exists winner_team_id uuid null references public.teams(id);

alter table public.matches
add column if not exists winner_reason text null;

alter table public.player_match_stats
add column if not exists own_goals integer not null default 0;

alter table public.matches enable row level security;
alter table public.jornada_attendance enable row level security;
alter table public.match_attendance enable row level security;
alter table public.jornada_mvp_votes enable row level security;
alter table public.match_players enable row level security;
alter table public.player_match_stats enable row level security;

drop policy if exists "dev anon read matches" on public.matches;
drop policy if exists "dev anon insert matches" on public.matches;
drop policy if exists "dev anon update matches" on public.matches;
drop policy if exists "dev anon delete matches" on public.matches;

create policy "dev anon read matches"
on public.matches
for select
to anon
using (true);

create policy "dev anon insert matches"
on public.matches
for insert
to anon
with check (true);

create policy "dev anon update matches"
on public.matches
for update
to anon
using (true)
with check (true);

create policy "dev anon delete matches"
on public.matches
for delete
to anon
using (true);

drop policy if exists "dev anon read jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon insert jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon update jornada attendance" on public.jornada_attendance;
drop policy if exists "dev anon delete jornada attendance" on public.jornada_attendance;

create policy "dev anon read jornada attendance"
on public.jornada_attendance
for select
to anon
using (true);

create policy "dev anon insert jornada attendance"
on public.jornada_attendance
for insert
to anon
with check (true);

create policy "dev anon update jornada attendance"
on public.jornada_attendance
for update
to anon
using (true)
with check (true);

create policy "dev anon delete jornada attendance"
on public.jornada_attendance
for delete
to anon
using (true);

drop policy if exists "dev anon read match attendance" on public.match_attendance;
drop policy if exists "dev anon insert match attendance" on public.match_attendance;
drop policy if exists "dev anon update match attendance" on public.match_attendance;
drop policy if exists "dev anon delete match attendance" on public.match_attendance;

create policy "dev anon read match attendance"
on public.match_attendance
for select
to anon
using (true);

create policy "dev anon insert match attendance"
on public.match_attendance
for insert
to anon
with check (true);

create policy "dev anon update match attendance"
on public.match_attendance
for update
to anon
using (true)
with check (true);

create policy "dev anon delete match attendance"
on public.match_attendance
for delete
to anon
using (true);

drop policy if exists "dev anon read match players" on public.match_players;
drop policy if exists "dev anon insert match players" on public.match_players;
drop policy if exists "dev anon update match players" on public.match_players;
drop policy if exists "dev anon delete match players" on public.match_players;

create policy "dev anon read match players"
on public.match_players
for select
to anon
using (true);

drop policy if exists "dev anon read jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon insert jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon update jornada mvp votes" on public.jornada_mvp_votes;
drop policy if exists "dev anon delete jornada mvp votes" on public.jornada_mvp_votes;

create policy "dev anon read jornada mvp votes"
on public.jornada_mvp_votes
for select
to anon
using (true);

create policy "dev anon insert jornada mvp votes"
on public.jornada_mvp_votes
for insert
to anon
with check (true);

create policy "dev anon update jornada mvp votes"
on public.jornada_mvp_votes
for update
to anon
using (true)
with check (true);

create policy "dev anon delete jornada mvp votes"
on public.jornada_mvp_votes
for delete
to anon
using (true);

create policy "dev anon insert match players"
on public.match_players
for insert
to anon
with check (true);

create policy "dev anon update match players"
on public.match_players
for update
to anon
using (true)
with check (true);

create policy "dev anon delete match players"
on public.match_players
for delete
to anon
using (true);

drop policy if exists "dev anon read player match stats" on public.player_match_stats;
drop policy if exists "dev anon insert player match stats" on public.player_match_stats;
drop policy if exists "dev anon update player match stats" on public.player_match_stats;
drop policy if exists "dev anon delete player match stats" on public.player_match_stats;

create policy "dev anon read player match stats"
on public.player_match_stats
for select
to anon
using (true);

create policy "dev anon insert player match stats"
on public.player_match_stats
for insert
to anon
with check (true);

create policy "dev anon update player match stats"
on public.player_match_stats
for update
to anon
using (true)
with check (true);

create policy "dev anon delete player match stats"
on public.player_match_stats
for delete
to anon
using (true);
