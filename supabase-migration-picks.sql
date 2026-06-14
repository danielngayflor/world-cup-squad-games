-- Add pick_state column and allow 'picking' status

alter table squads add column if not exists pick_state jsonb;

alter table squads drop constraint if exists squads_status_check;
alter table squads add constraint squads_status_check
  check (status in ('forming','picking','drawn','active','completed'));
