-- Assign / insert sensor readings for Faith and Paul
-- Run in Supabase SQL Editor after sensor_readings exists

-- 1) Reassign any unassigned rows (~62% Faith, ~38% Paul)
with numbered as (
  select
    id,
    row_number() over (order by created_at) as rn,
    count(*) over () as total
  from public.sensor_readings
  where user_email is null
)
update public.sensor_readings as readings
set user_email = case
  when numbered.rn <= greatest(1, floor(numbered.total * 0.62))
    then 'faithkemboi21@gmail.com'
  else 'paulkevinkariuki@gmail.com'
end
from numbered
where readings.id = numbered.id;

-- 2) If the table is empty / low, insert sample rows for both users
insert into public.sensor_readings (ph, temperature, water_level, user_email, created_at)
select
  round((5.8 + random() * 0.6)::numeric, 2),
  round((20 + random() * 3)::numeric, 2),
  round((70 + random() * 25)::numeric, 2),
  case when g <= 62 then 'faithkemboi21@gmail.com' else 'paulkevinkariuki@gmail.com' end,
  now() - ((100 - g) * interval '5 seconds')
from generate_series(1, 100) as g
where (select count(*) from public.sensor_readings) < 60;
