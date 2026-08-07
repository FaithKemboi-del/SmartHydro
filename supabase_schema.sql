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

create table if not exists public.user_queries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  user_email text not null,
  user_name text,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'answered')),
  admin_response text,
  responded_at timestamp with time zone,
  responded_by text
);

alter table public.sensor_readings add column if not exists user_email text;
alter table public.app_users add column if not exists name text;

insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.app_users (email, name, role, status, last_seen, created_at)
values
  ('fyugalbox21@gmail.com', 'Admin', 'admin', 'active', now(), '2026-06-01 08:00:00+00'),
  ('faithkemboi21@gmail.com', 'Faith', 'user', 'active', now() - interval '2 hours', '2026-06-03 09:15:00+00'),
  ('paulkevinkariuki@gmail.com', 'Paul', 'user', 'inactive', now() - interval '3 days', '2026-06-28 14:40:00+00'),
  ('awuor053@gmail.com', 'Awuor', 'user', 'active', now() - interval '30 minutes', '2026-08-07 10:00:00+00'),
  ('amani.wambui@example.com', 'Amani Wambui', 'user', 'inactive', now() - interval '2 hours', '2026-06-04 10:00:00+00'),
  ('brian.otieno@example.com', 'Brian Otieno', 'user', 'inactive', now() - interval '5 hours', '2026-06-05 11:20:00+00'),
  ('carol.njeri@example.com', 'Carol Njeri', 'user', 'inactive', now() - interval '1 hour', '2026-06-06 09:40:00+00'),
  ('daniel.kipchoge@example.com', 'Daniel Kipchoge', 'user', 'inactive', now() - interval '3 days', '2026-06-07 14:15:00+00'),
  ('esther.akinyi@example.com', 'Esther Akinyi', 'user', 'inactive', now() - interval '4 hours', '2026-06-08 08:30:00+00'),
  ('felix.mwangi@example.com', 'Felix Mwangi', 'user', 'inactive', now() - interval '6 hours', '2026-06-09 16:05:00+00'),
  ('grace.chebet@example.com', 'Grace Chebet', 'user', 'inactive', now() - interval '90 minutes', '2026-06-10 12:45:00+00'),
  ('hassan.ali@example.com', 'Hassan Ali', 'user', 'inactive', now() - interval '4 days', '2026-06-11 07:55:00+00'),
  ('irene.muthoni@example.com', 'Irene Muthoni', 'user', 'inactive', now() - interval '3 hours', '2026-06-12 13:10:00+00'),
  ('james.kamau@example.com', 'James Kamau', 'user', 'inactive', now() - interval '7 hours', '2026-06-13 15:25:00+00'),
  ('karen.wanjira@example.com', 'Karen Wanjira', 'user', 'inactive', now() - interval '2 hours', '2026-06-14 10:50:00+00'),
  ('leo.barasa@example.com', 'Leo Barasa', 'user', 'inactive', now() - interval '5 days', '2026-06-15 09:05:00+00'),
  ('mary.atieno@example.com', 'Mary Atieno', 'user', 'inactive', now() - interval '40 minutes', '2026-06-16 11:35:00+00'),
  ('nathan.kiplagat@example.com', 'Nathan Kiplagat', 'user', 'inactive', now() - interval '8 hours', '2026-06-17 14:00:00+00'),
  ('olive.nyambura@example.com', 'Olive Nyambura', 'user', 'inactive', now() - interval '1 day', '2026-06-18 08:20:00+00'),
  ('peter.odhiambo@example.com', 'Peter Odhiambo', 'user', 'inactive', now() - interval '6 days', '2026-06-19 17:40:00+00'),
  ('queen.jemutai@example.com', 'Queen Jemutai', 'user', 'inactive', now() - interval '3 hours', '2026-06-20 12:15:00+00'),
  ('ryan.mutua@example.com', 'Ryan Mutua', 'user', 'inactive', now() - interval '5 hours', '2026-06-21 09:55:00+00'),
  ('sarah.wanjiku@example.com', 'Sarah Wanjiku', 'user', 'inactive', now() - interval '2 hours', '2026-06-22 16:30:00+00'),
  ('tom.kiarie@example.com', 'Tom Kiarie', 'user', 'inactive', now() - interval '2 days', '2026-06-23 11:10:00+00'),
  ('uma.cherono@example.com', 'Uma Cherono', 'user', 'inactive', now() - interval '6 hours', '2026-06-24 13:45:00+00'),
  ('victor.omondi@example.com', 'Victor Omondi', 'user', 'inactive', now() - interval '90 minutes', '2026-06-25 08:05:00+00'),
  ('winnie.njoki@example.com', 'Winnie Njoki', 'user', 'inactive', now() - interval '4 hours', '2026-06-26 15:50:00+00'),
  ('xavier.korir@example.com', 'Xavier Korir', 'user', 'inactive', now() - interval '7 days', '2026-06-27 10:25:00+00'),
  ('yvonne.awuor@example.com', 'Yvonne Awuor', 'user', 'inactive', now() - interval '1 hour', '2026-06-29 14:35:00+00')
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  last_seen = excluded.last_seen,
  created_at = excluded.created_at;

alter table public.sensor_readings disable row level security;
alter table public.app_users disable row level security;
alter table public.alert_logs disable row level security;
alter table public.system_settings disable row level security;
alter table public.user_queries disable row level security;

-- Remove any existing policies, then ensure RLS stays off for this student project.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('sensor_readings', 'app_users', 'alert_logs', 'system_settings', 'user_queries')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table public.sensor_readings disable row level security;
alter table public.app_users disable row level security;
alter table public.alert_logs disable row level security;
alter table public.system_settings disable row level security;
alter table public.user_queries disable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.sensor_readings to anon, authenticated, service_role;
grant select, insert, update, delete on public.app_users to anon, authenticated, service_role;
grant select, insert, update, delete on public.alert_logs to anon, authenticated, service_role;
grant select, insert, update, delete on public.system_settings to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_queries to anon, authenticated, service_role;
