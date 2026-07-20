create extension if not exists pgcrypto;

create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  ph double precision not null,
  temperature double precision not null,
  water_level double precision not null,
  user_email text
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null default 'user',
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_seen timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.alert_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  source text not null default 'system'
);

create table if not exists public.system_settings (
  id integer primary key default 1 check (id = 1),
  monitoring_enabled boolean not null default true,
  ph_sensor_enabled boolean not null default true,
  temperature_sensor_enabled boolean not null default true,
  water_sensor_enabled boolean not null default true,
  ec_sensor_enabled boolean not null default true,
  anomaly_detection_enabled boolean not null default true,
  updated_at timestamp with time zone not null default now()
);

alter table public.sensor_readings add column if not exists user_email text;
alter table public.app_users add column if not exists name text;

insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.app_users (email, name, role, status, last_seen, created_at)
values
  ('fyugalbox21@gmail.com', 'Admin', 'admin', 'active', now(), now()),
  ('faithkemboi21@gmail.com', 'Faith', 'user', 'active', now() - interval '2 hours', now() - interval '5 days'),
  ('paulkevinkariuki@gmail.com', 'Paul', 'user', 'inactive', now() - interval '3 days', now() - interval '10 days')
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  last_seen = excluded.last_seen;

alter table public.sensor_readings disable row level security;
alter table public.app_users disable row level security;
alter table public.alert_logs disable row level security;
alter table public.system_settings disable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.sensor_readings to anon, authenticated, service_role;
grant select, insert, update, delete on public.app_users to anon, authenticated, service_role;
grant select, insert, update, delete on public.alert_logs to anon, authenticated, service_role;
grant select, insert, update, delete on public.system_settings to anon, authenticated, service_role;
