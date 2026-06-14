-- Run this in Supabase SQL Editor to add stakes support

alter table squads
  add column if not exists stakes_enabled boolean not null default false,
  add column if not exists stake_amount numeric,
  add column if not exists currency text;
