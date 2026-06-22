create extension if not exists pgcrypto;

create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  ph double precision not null,
  temperature double precision not null,
  water_level double precision not null
);

alter table public.sensor_readings disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.sensor_readings to anon, authenticated, service_role;
