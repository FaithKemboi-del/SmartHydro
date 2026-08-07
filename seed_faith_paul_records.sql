-- Seed Faith and Paul sensor readings from join date, every 5 minutes
-- Run in Supabase SQL Editor after fix_rls.sql
--
-- Faith joined: 2026-06-03 09:15
-- Paul joined:  2026-06-28 14:40
-- Interval:     5 minutes
--
-- This creates thousands of rows (much more than 100).

-- Optional: clear previous Faith/Paul readings before reseed
delete from public.sensor_readings
where user_email in ('faithkemboi21@gmail.com', 'paulkevinkariuki@gmail.com');

-- Faith: from join date to now, every 5 minutes
insert into public.sensor_readings (ph, temperature, water_level, user_email, created_at)
select
  round((5.7 + random() * 0.8)::numeric, 2),
  round((19.5 + random() * 4.0)::numeric, 2),
  round((55 + random() * 40)::numeric, 2),
  'faithkemboi21@gmail.com',
  stamp
from generate_series(
  timestamptz '2026-06-03 09:15:00+00',
  now(),
  interval '5 minutes'
) as stamp;

-- Paul: from join date to now, every 5 minutes
insert into public.sensor_readings (ph, temperature, water_level, user_email, created_at)
select
  round((5.7 + random() * 0.8)::numeric, 2),
  round((19.5 + random() * 4.0)::numeric, 2),
  round((55 + random() * 40)::numeric, 2),
  'paulkevinkariuki@gmail.com',
  stamp
from generate_series(
  timestamptz '2026-06-28 14:40:00+00',
  now(),
  interval '5 minutes'
) as stamp;
