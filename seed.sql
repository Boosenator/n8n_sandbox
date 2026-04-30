-- Sandbox seed data for the Altegio-compatible endpoints.
-- Run after mirgration.sql.
--
-- The API returns UUID ids from public.staff/public.services.
-- external_id values are human-friendly labels for admin/debugging only.

begin;

-- Remove previous sandbox seed records that are safe to regenerate.
delete from public.booking_services
where booking_id in (
  select id from public.bookings where metadata->>'seed' = 'altegio_sandbox_seed'
);

delete from public.bookings
where metadata->>'seed' = 'altegio_sandbox_seed';

delete from public.schedule_exceptions
where notes = 'altegio_sandbox_seed'
   or label like 'Seed:%';

delete from public.staff_schedules
where staff_id in (
  select id from public.staff
  where external_id in ('staff_victoria', 'staff_dmytro', 'staff_valeriia')
);

delete from public.staff_services
where staff_id in (
  select id from public.staff
  where external_id in ('staff_victoria', 'staff_dmytro', 'staff_valeriia')
);

insert into public.service_categories (id, external_id, name, description, sort_order, active)
values
  ('11111111-1111-1111-1111-111111111101', 'cat_hair', 'Hair', 'Стрижки, укладки та догляд за волоссям', 10, true),
  ('11111111-1111-1111-1111-111111111102', 'cat_color', 'Color', 'Фарбування та тонування', 20, true),
  ('11111111-1111-1111-1111-111111111103', 'cat_care', 'Care', 'Відновлення та кератин', 30, true)
on conflict (external_id) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.services (id, external_id, category_id, name, duration_minutes, price_from, active)
values
  (
    '22222222-2222-2222-2222-222222222201',
    'svc_haircut',
    '11111111-1111-1111-1111-111111111101',
    'Жіноча стрижка',
    60,
    900,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    'svc_coloring',
    '11111111-1111-1111-1111-111111111102',
    'Складне фарбування',
    180,
    3200,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    'svc_keratin',
    '11111111-1111-1111-1111-111111111103',
    'Кератин',
    150,
    2800,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    'svc_style',
    '11111111-1111-1111-1111-111111111101',
    'Укладка',
    45,
    700,
    true
  )
on conflict (external_id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_from = excluded.price_from,
  active = excluded.active;

insert into public.staff (id, external_id, name, role, active, notes)
values
  (
    '33333333-3333-3333-3333-333333333301',
    'staff_victoria',
    'Вікторія',
    'Top stylist',
    true,
    'Сильна в стрижках та укладках.'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'staff_dmytro',
    'Дмитро',
    'Colorist',
    true,
    'Складні фарбування та кератин.'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'staff_valeriia',
    'Валерія',
    'Senior master',
    true,
    'Працює з VIP-клієнтами, стрижки, колір і догляд.'
  )
on conflict (external_id) do update set
  name = excluded.name,
  role = excluded.role,
  active = excluded.active,
  notes = excluded.notes;

insert into public.staff_services (staff_id, service_id, seance_length, price_override, active)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 60, 1100, true),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204', 45, 800, true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 180, 3400, true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222203', 150, 2900, true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 60, 1000, true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202', 180, 3600, true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 150, 3100, true)
on conflict (staff_id, service_id) do update set
  seance_length = excluded.seance_length,
  price_override = excluded.price_override,
  active = excluded.active;

-- Recurring weekly availability.
-- day_of_week follows JavaScript Date.getDay(): 0 Sunday, 1 Monday, ... 6 Saturday.
insert into public.staff_schedules (staff_id, day_of_week, start_time, end_time, is_working, valid_from, valid_to)
values
  ('33333333-3333-3333-3333-333333333301', 1, '09:00', '18:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333301', 2, '10:00', '19:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333301', 4, '09:00', '17:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333301', 5, '10:00', '16:00', true, '2026-05-01', null),

  ('33333333-3333-3333-3333-333333333302', 2, '11:00', '20:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333302', 3, '09:00', '18:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333302', 5, '09:00', '18:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333302', 6, '10:00', '15:00', true, '2026-05-01', null),

  ('33333333-3333-3333-3333-333333333303', 1, '12:00', '20:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333303', 3, '10:00', '19:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333303', 4, '10:00', '19:00', true, '2026-05-01', null),
  ('33333333-3333-3333-3333-333333333303', 6, '09:00', '14:00', true, '2026-05-01', null);

-- One-off blocks and extra windows for testing busy/free behavior.
insert into public.schedule_exceptions (staff_id, exception_date, start_time, end_time, exception_type, label, notes)
values
  (
    '33333333-3333-3333-3333-333333333301',
    '2026-05-04',
    '13:00',
    '14:00',
    'break',
    'Seed: lunch break',
    'altegio_sandbox_seed'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '2026-05-06',
    '15:00',
    '16:30',
    'blocked',
    'Seed: training block',
    'altegio_sandbox_seed'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    '2026-05-05',
    '09:00',
    '12:00',
    'custom_open',
    'Seed: extra morning window',
    'altegio_sandbox_seed'
  );

-- Bookings occupy otherwise available slots.
insert into public.bookings (
  id,
  contact_id,
  staff_id,
  service_id,
  starts_at,
  ends_at,
  status,
  client_name,
  client_phone,
  source,
  metadata
)
values
  (
    '44444444-4444-4444-4444-444444444401',
    'seed-client-anna',
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '2026-05-04 10:00:00+00',
    '2026-05-04 11:00:00+00',
    'confirmed',
    'Анна',
    '+380991112233',
    'manual',
    '{"seed":"altegio_sandbox_seed","note":"occupied haircut slot"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    'seed-client-iryna',
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222202',
    '2026-05-06 09:00:00+00',
    '2026-05-06 12:00:00+00',
    'confirmed',
    'Ірина',
    '+380971234567',
    'manual',
    '{"seed":"altegio_sandbox_seed","note":"occupied coloring slot"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    'seed-client-olena',
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222203',
    '2026-05-07 13:00:00+00',
    '2026-05-07 15:30:00+00',
    'confirmed',
    'Олена',
    '+380931234567',
    'manual',
    '{"seed":"altegio_sandbox_seed","note":"occupied keratin slot"}'::jsonb
  );

insert into public.booking_services (
  booking_id,
  service_id,
  staff_id,
  duration_minutes,
  price,
  sort_order,
  metadata
)
values
  (
    '44444444-4444-4444-4444-444444444401',
    '22222222-2222-2222-2222-222222222201',
    '33333333-3333-3333-3333-333333333301',
    60,
    1100,
    0,
    '{"seed":"altegio_sandbox_seed"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '22222222-2222-2222-2222-222222222202',
    '33333333-3333-3333-3333-333333333302',
    180,
    3400,
    0,
    '{"seed":"altegio_sandbox_seed"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '22222222-2222-2222-2222-222222222203',
    '33333333-3333-3333-3333-333333333303',
    150,
    3100,
    0,
    '{"seed":"altegio_sandbox_seed"}'::jsonb
  );

commit;
