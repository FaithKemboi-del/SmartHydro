-- Fix RLS so seed scripts and app features can use project tables
-- Run this in Supabase: SQL Editor → New query → Run

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

-- Drop any existing policies on project tables
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
