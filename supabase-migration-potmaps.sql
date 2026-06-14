-- Add pot_maps column (replaces old pick_state turn-based approach)
alter table squads add column if not exists pot_maps jsonb;

-- Allow 'picking' status (in case not already added)
alter table squads drop constraint if exists squads_status_check;
alter table squads add constraint squads_status_check
  check (status in ('forming','picking','drawn','active','completed'));
