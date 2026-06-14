-- Run this in your Supabase SQL editor

create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  squad_id text unique not null,
  name text not null,
  leader_phone text not null,
  member_count_target int not null check (member_count_target between 4 and 8),
  status text not null default 'forming' check (status in ('forming','drawn','active','completed')),
  members jsonb not null default '[]',
  draw_results jsonb,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id text primary key,
  name text not null,
  flag text not null,
  pot text not null check (pot in ('A','B','C','D')),
  status text not null default 'alive' check (status in ('alive','eliminated','champion'))
);

-- Seed the 48 teams
insert into teams (id, name, flag, pot) values
-- Pot A
('arg','Argentina','🇦🇷','A'),
('fra','France','🇫🇷','A'),
('eng','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿','A'),
('bra','Brazil','🇧🇷','A'),
('bel','Belgium','🇧🇪','A'),
('por','Portugal','🇵🇹','A'),
('ned','Netherlands','🇳🇱','A'),
('spa','Spain','🇪🇸','A'),
('ger','Germany','🇩🇪','A'),
('usa','USA','🇺🇸','A'),
('can','Canada','🇨🇦','A'),
('mex','Mexico','🇲🇽','A'),
-- Pot B
('uru','Uruguay','🇺🇾','B'),
('col','Colombia','🇨🇴','B'),
('cro','Croatia','🇭🇷','B'),
('den','Denmark','🇩🇰','B'),
('swi','Switzerland','🇨🇭','B'),
('sen','Senegal','🇸🇳','B'),
('aus','Australia','🇦🇺','B'),
('jap','Japan','🇯🇵','B'),
('kor','South Korea','🇰🇷','B'),
('pol','Poland','🇵🇱','B'),
('mar','Morocco','🇲🇦','B'),
('ira','Iran','🇮🇷','B'),
-- Pot C
('mex2','Ecuador','🇪🇨','C'),
('qat','Qatar','🇶🇦','C'),
('tun','Tunisia','🇹🇳','C'),
('crc','Costa Rica','🇨🇷','C'),
('ser','Serbia','🇷🇸','C'),
('wal','Wales','🏴󠁧󠁢󠁷󠁬󠁳󠁿','C'),
('cmr','Cameroon','🇨🇲','C'),
('gha','Ghana','🇬🇭','C'),
('nga','Nigeria','🇳🇬','C'),
('egy','Egypt','🇪🇬','C'),
('alg','Algeria','🇩🇿','C'),
('saf','South Africa','🇿🇦','C'),
-- Pot D
('ksa','Saudi Arabia','🇸🇦','D'),
('ire','Ireland','🇮🇪','D'),
('sco','Scotland','🏴󠁧󠁢󠁳󠁣󠁴󠁿','D'),
('bih','Bosnia','🇧🇦','D'),
('ven','Venezuela','🇻🇪','D'),
('par','Paraguay','🇵🇾','D'),
('bol','Bolivia','🇧🇴','D'),
('pan','Panama','🇵🇦','D'),
('jam','Jamaica','🇯🇲','D'),
('ang','Angola','🇦🇴','D'),
('uga','Uganda','🇺🇬','D'),
('ind','Indonesia','🇮🇩','D')
on conflict (id) do nothing;

-- Enable Row Level Security (allow all reads, restrict writes)
alter table squads enable row level security;
alter table teams enable row level security;

-- Public read for both tables
create policy "public read squads" on squads for select using (true);
create policy "public read teams" on teams for select using (true);

-- Allow all writes from service role (API routes use anon key for now — loosen for v1)
create policy "public write squads" on squads for all using (true) with check (true);
create policy "public write teams" on teams for all using (true) with check (true);
