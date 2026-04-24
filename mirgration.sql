-- Consolidated target schema for VAngel sandbox / admin / observability.
-- This file is meant to preserve the agreed data model in one place.
-- Review carefully before applying to an existing database with live data.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Users: one durable record per real contact/customer.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null unique,
  name text,
  username text,
  phone text,
  channel text not null default 'instagram',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_channel on public.users(channel);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_last_seen_at on public.users(last_seen_at desc);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Sessions: current or historical dialog cycles tied to a user.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references public.users(id) on delete set null,
  contact_id text not null,
  contact_name text,
  contact_username text,
  persona text not null default 'new_client',
  webhook_url text,
  debug_payload boolean not null default false,
  status text not null default 'active',
  dialog_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_status_check
    check (status in ('active', 'in_progress', 'awaiting_user', 'paused', 'resolved', 'stale')),
  constraint sessions_persona_check
    check (persona in ('new_client', 'returning', 'vip', 'complaint'))
);

create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_contact_id on public.sessions(contact_id);
create index if not exists idx_sessions_status on public.sessions(status);
create index if not exists idx_sessions_last_activity_at on public.sessions(last_activity_at desc);

drop trigger if exists trg_sessions_updated_at on public.sessions;
create trigger trg_sessions_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

-- Customer profiles: long-term portrait and preferences distilled from history.
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  contact_id text not null unique,
  summary text,
  preferred_services jsonb not null default '[]'::jsonb,
  preferred_staff jsonb not null default '[]'::jsonb,
  visit_pattern text,
  price_sensitivity text,
  tone_profile text,
  risk_flags jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  profile_json jsonb not null default '{}'::jsonb,
  last_profile_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profiles_price_sensitivity_check
    check (price_sensitivity in ('low', 'medium', 'high') or price_sensitivity is null)
);

create index if not exists idx_customer_profiles_user_id on public.customer_profiles(user_id);
create index if not exists idx_customer_profiles_last_profile_update
  on public.customer_profiles(last_profile_update desc);

drop trigger if exists trg_customer_profiles_updated_at on public.customer_profiles;
create trigger trg_customer_profiles_updated_at
before update on public.customer_profiles
for each row
execute function public.set_updated_at();

-- Event log: universal raw event stream for messages, tools, status changes, bookings, escalations.
create table if not exists public.event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text references public.sessions(session_id) on delete set null,
  contact_id text,
  event_type text not null,
  event_subtype text,
  source text not null default 'system',
  title text,
  detail text,
  tone text not null default 'neutral',
  payload jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint event_log_event_type_check
    check (
      event_type in (
        'incoming_message',
        'outgoing_message',
        'interim_message',
        'tool_call',
        'tool_result',
        'review_signal',
        'booking_created',
        'booking_updated',
        'booking_cancelled',
        'escalation',
        'session_status_changed',
        'profile_updated',
        'system'
      )
    ),
  constraint event_log_tone_check
    check (tone in ('neutral', 'green', 'yellow', 'red'))
);

create index if not exists idx_event_log_user_id on public.event_log(user_id);
create index if not exists idx_event_log_session_id on public.event_log(session_id);
create index if not exists idx_event_log_contact_id on public.event_log(contact_id);
create index if not exists idx_event_log_event_type on public.event_log(event_type);
create index if not exists idx_event_log_event_at on public.event_log(event_at desc);

-- Dialog review layer: moderation/scoring records for admin follow-up.
create table if not exists public.dialogs_for_review (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text references public.sessions(session_id) on delete set null,
  contact_id text,
  source text not null default 'n8n',
  severity text not null default 'green',
  trigger_reasons jsonb not null default '[]'::jsonb,
  user_message text,
  agent_reply text,
  confidence_score numeric(6,4),
  tone_score numeric(6,4),
  hallucination_score numeric(6,4),
  raw_review jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewed_by text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dialogs_for_review_severity_check
    check (severity in ('green', 'yellow', 'red')),
  constraint dialogs_for_review_status_check
    check (status in ('pending', 'reviewed', 'approved', 'rejected')),
  constraint dialogs_for_review_confidence_score_check
    check (confidence_score between 0 and 10 or confidence_score is null),
  constraint dialogs_for_review_tone_score_check
    check (tone_score between 0 and 10 or tone_score is null),
  constraint dialogs_for_review_hallucination_score_check
    check (hallucination_score between 0 and 10 or hallucination_score is null)
);

create index if not exists idx_dialogs_for_review_user_id on public.dialogs_for_review(user_id);
create index if not exists idx_dialogs_for_review_session_id on public.dialogs_for_review(session_id);
create index if not exists idx_dialogs_for_review_contact_id on public.dialogs_for_review(contact_id);
create index if not exists idx_dialogs_for_review_severity on public.dialogs_for_review(severity);
create index if not exists idx_dialogs_for_review_status on public.dialogs_for_review(status);
create index if not exists idx_dialogs_for_review_created_at on public.dialogs_for_review(created_at desc);

drop trigger if exists trg_dialogs_for_review_updated_at on public.dialogs_for_review;
create trigger trg_dialogs_for_review_updated_at
before update on public.dialogs_for_review
for each row
execute function public.set_updated_at();

-- Staff / services: operational mirror for mock Altegio admin state.
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_categories_active on public.service_categories(active);
create index if not exists idx_service_categories_sort_order on public.service_categories(sort_order, name);

drop trigger if exists trg_service_categories_updated_at on public.service_categories;
create trigger trg_service_categories_updated_at
before update on public.service_categories
for each row
execute function public.set_updated_at();

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  role text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_active on public.staff(active);

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at
before update on public.staff
for each row
execute function public.set_updated_at();

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  duration_minutes integer not null default 60,
  price_from numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_duration_minutes_check
    check (duration_minutes > 0),
  constraint services_price_from_check
    check (price_from >= 0)
);

create index if not exists idx_services_active on public.services(active);
create index if not exists idx_services_category_id on public.services(category_id);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

create table if not exists public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  seance_length integer,
  price_override numeric(10,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_services_seance_length_check
    check (seance_length > 0 or seance_length is null),
  constraint staff_services_price_override_check
    check (price_override >= 0 or price_override is null),
  primary key (staff_id, service_id)
);

create index if not exists idx_staff_services_service_id on public.staff_services(service_id);
create index if not exists idx_staff_services_active on public.staff_services(active);

-- Staff schedules: recurring weekly availability windows.
create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_working boolean not null default true,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_schedules_day_of_week_check
    check (day_of_week between 0 and 6),
  constraint staff_schedules_time_range_check
    check (end_time > start_time),
  constraint staff_schedules_valid_range_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_staff_schedules_staff_id on public.staff_schedules(staff_id);
create index if not exists idx_staff_schedules_day_of_week on public.staff_schedules(day_of_week);
create index if not exists idx_staff_schedules_valid_range on public.staff_schedules(valid_from, valid_to);

drop trigger if exists trg_staff_schedules_updated_at on public.staff_schedules;
create trigger trg_staff_schedules_updated_at
before update on public.staff_schedules
for each row
execute function public.set_updated_at();

-- Schedule exceptions: ad-hoc overrides like vacations, lunch, manual blocks, or extra windows.
create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  exception_date date not null,
  start_time time,
  end_time time,
  exception_type text not null default 'blocked',
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_exceptions_type_check
    check (exception_type in ('blocked', 'time_off', 'break', 'custom_open')),
  constraint schedule_exceptions_time_pair_check
    check (
      (start_time is null and end_time is null)
      or (start_time is not null and end_time is not null and end_time > start_time)
    )
);

create index if not exists idx_schedule_exceptions_staff_id on public.schedule_exceptions(staff_id);
create index if not exists idx_schedule_exceptions_date on public.schedule_exceptions(exception_date desc);
create index if not exists idx_schedule_exceptions_type on public.schedule_exceptions(exception_type);

drop trigger if exists trg_schedule_exceptions_updated_at on public.schedule_exceptions;
create trigger trg_schedule_exceptions_updated_at
before update on public.schedule_exceptions
for each row
execute function public.set_updated_at();

-- Bookings: appointments tied to user/session and staff/service choices.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text references public.sessions(session_id) on delete set null,
  contact_id text,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'pending',
  client_name text,
  client_phone text,
  source text not null default 'sandbox',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  constraint bookings_source_check
    check (source in ('sandbox', 'altegio', 'manual', 'n8n')),
  constraint bookings_ends_at_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_session_id on public.bookings(session_id);
create index if not exists idx_bookings_contact_id on public.bookings(contact_id);
create index if not exists idx_bookings_staff_id on public.bookings(staff_id);
create index if not exists idx_bookings_service_id on public.bookings(service_id);
create index if not exists idx_bookings_starts_at on public.bookings(starts_at desc);
create index if not exists idx_bookings_status on public.bookings(status);

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

-- Booking services: allows one visit/booking to include multiple services.
create table if not exists public.booking_services (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  duration_minutes integer,
  price numeric(10,2),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_services_duration_minutes_check
    check (duration_minutes > 0 or duration_minutes is null),
  constraint booking_services_price_check
    check (price >= 0 or price is null),
  primary key (booking_id, sort_order)
);

create index if not exists idx_booking_services_service_id on public.booking_services(service_id);
create index if not exists idx_booking_services_staff_id on public.booking_services(staff_id);

commit;
