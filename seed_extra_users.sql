-- Add 25 extra demo users to public.app_users
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

insert into public.app_users (email, name, role, status, last_seen, created_at)
values
  ('amani.wambui@example.com', 'Amani Wambui', 'user', 'active', now() - interval '2 hours', '2026-06-04 10:00:00+00'),
  ('brian.otieno@example.com', 'Brian Otieno', 'user', 'active', now() - interval '5 hours', '2026-06-05 11:20:00+00'),
  ('carol.njeri@example.com', 'Carol Njeri', 'user', 'active', now() - interval '1 hour', '2026-06-06 09:40:00+00'),
  ('daniel.kipchoge@example.com', 'Daniel Kipchoge', 'user', 'inactive', now() - interval '3 days', '2026-06-07 14:15:00+00'),
  ('esther.akinyi@example.com', 'Esther Akinyi', 'user', 'active', now() - interval '4 hours', '2026-06-08 08:30:00+00'),
  ('felix.mwangi@example.com', 'Felix Mwangi', 'user', 'active', now() - interval '6 hours', '2026-06-09 16:05:00+00'),
  ('grace.chebet@example.com', 'Grace Chebet', 'user', 'active', now() - interval '90 minutes', '2026-06-10 12:45:00+00'),
  ('hassan.ali@example.com', 'Hassan Ali', 'user', 'inactive', now() - interval '4 days', '2026-06-11 07:55:00+00'),
  ('irene.muthoni@example.com', 'Irene Muthoni', 'user', 'active', now() - interval '3 hours', '2026-06-12 13:10:00+00'),
  ('james.kamau@example.com', 'James Kamau', 'user', 'active', now() - interval '7 hours', '2026-06-13 15:25:00+00'),
  ('karen.wanjira@example.com', 'Karen Wanjira', 'user', 'active', now() - interval '2 hours', '2026-06-14 10:50:00+00'),
  ('leo.barasa@example.com', 'Leo Barasa', 'user', 'inactive', now() - interval '5 days', '2026-06-15 09:05:00+00'),
  ('mary.atieno@example.com', 'Mary Atieno', 'user', 'active', now() - interval '40 minutes', '2026-06-16 11:35:00+00'),
  ('nathan.kiplagat@example.com', 'Nathan Kiplagat', 'user', 'active', now() - interval '8 hours', '2026-06-17 14:00:00+00'),
  ('olive.nyambura@example.com', 'Olive Nyambura', 'user', 'active', now() - interval '1 day', '2026-06-18 08:20:00+00'),
  ('peter.odhiambo@example.com', 'Peter Odhiambo', 'user', 'inactive', now() - interval '6 days', '2026-06-19 17:40:00+00'),
  ('queen.jemutai@example.com', 'Queen Jemutai', 'user', 'active', now() - interval '3 hours', '2026-06-20 12:15:00+00'),
  ('ryan.mutua@example.com', 'Ryan Mutua', 'user', 'active', now() - interval '5 hours', '2026-06-21 09:55:00+00'),
  ('sarah.wanjiku@example.com', 'Sarah Wanjiku', 'user', 'active', now() - interval '2 hours', '2026-06-22 16:30:00+00'),
  ('tom.kiarie@example.com', 'Tom Kiarie', 'user', 'inactive', now() - interval '2 days', '2026-06-23 11:10:00+00'),
  ('uma.cherono@example.com', 'Uma Cherono', 'user', 'active', now() - interval '6 hours', '2026-06-24 13:45:00+00'),
  ('victor.omondi@example.com', 'Victor Omondi', 'user', 'active', now() - interval '90 minutes', '2026-06-25 08:05:00+00'),
  ('winnie.njoki@example.com', 'Winnie Njoki', 'user', 'active', now() - interval '4 hours', '2026-06-26 15:50:00+00'),
  ('xavier.korir@example.com', 'Xavier Korir', 'user', 'inactive', now() - interval '7 days', '2026-06-27 10:25:00+00'),
  ('yvonne.awuor@example.com', 'Yvonne Awuor', 'user', 'active', now() - interval '1 hour', '2026-06-29 14:35:00+00')
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  last_seen = excluded.last_seen,
  created_at = excluded.created_at;
