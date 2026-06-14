-- Squad chat messages
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  squad_id text not null,
  sender_phone text not null,
  sender_name text not null,
  content text,
  image_url text,
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "public read messages" on messages for select using (true);
create policy "public insert messages" on messages for insert with check (true);

-- Fixtures (global match schedule + results, fed from ESPN)
create table if not exists fixtures (
  id uuid default gen_random_uuid() primary key,
  espn_id text unique,
  team1_id text not null,
  team2_id text not null,
  team1_name text,
  team2_name text,
  team1_score int,
  team2_score int,
  match_date timestamptz not null,
  stage text not null default 'Group Stage',
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  created_at timestamptz default now()
);

alter table fixtures enable row level security;
create policy "public read fixtures" on fixtures for select using (true);
create policy "public insert fixtures" on fixtures for insert with check (true);
create policy "public update fixtures" on fixtures for update using (true);
create policy "public delete fixtures" on fixtures for delete using (true);
