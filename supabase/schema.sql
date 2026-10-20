-- Stackly – Datenbank-Setup
-- In Supabase: SQL Editor → New query → diesen Inhalt einfügen → Run

-- Anfragen / Aufträge
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 120),
  email        text not null check (char_length(email) between 3 and 200),
  projekttyp   text not null check (char_length(projekttyp) <= 60),
  deadline     date,
  beispiel     text check (char_length(beispiel) <= 500),
  beschreibung text not null check (char_length(beschreibung) between 20 and 3000),
  status       text not null default 'neu'
               check (status in ('neu', 'pruefung', 'angenommen', 'in_arbeit', 'fertig', 'abgelehnt')),
  zugewiesen   text,
  notiz        text
);

-- Team-Mitglieder: nur diese E-Mails dürfen ins Dashboard
create table if not exists public.team_members (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- updated_at automatisch setzen
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

-- Zugriffsregeln (Row Level Security)
alter table public.requests enable row level security;
alter table public.team_members enable row level security;

-- Besucher dürfen nur neue Anfragen anlegen, nichts lesen
drop policy if exists "Besucher legen Anfragen an" on public.requests;
create policy "Besucher legen Anfragen an" on public.requests
  for insert to anon, authenticated
  with check (status = 'neu' and zugewiesen is null and notiz is null);

-- Team darf alles lesen und bearbeiten
drop policy if exists "Team liest Anfragen" on public.requests;
create policy "Team liest Anfragen" on public.requests
  for select to authenticated using (public.is_team_member());

drop policy if exists "Team bearbeitet Anfragen" on public.requests;
create policy "Team bearbeitet Anfragen" on public.requests
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

drop policy if exists "Team löscht Anfragen" on public.requests;
create policy "Team löscht Anfragen" on public.requests
  for delete to authenticated using (public.is_team_member());

drop policy if exists "Team sieht Team" on public.team_members;
create policy "Team sieht Team" on public.team_members
  for select to authenticated using (public.is_team_member());

-- Live-Updates im Dashboard
alter publication supabase_realtime add table public.requests;

-- Erstes Team-Mitglied eintragen (E-Mail anpassen!):
-- insert into public.team_members (email, name) values ('deine@email.de', 'Dein Name');
