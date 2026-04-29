create table if not exists public.jornada_status (
  jornada_date date primary key,
  is_closed boolean not null default false,
  closed_at timestamptz null,
  closed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.jornada_status enable row level security;

drop policy if exists "public read jornada status" on public.jornada_status;
create policy "public read jornada status"
on public.jornada_status
for select
using (true);

drop policy if exists "admin write jornada status" on public.jornada_status;
create policy "admin write jornada status"
on public.jornada_status
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
