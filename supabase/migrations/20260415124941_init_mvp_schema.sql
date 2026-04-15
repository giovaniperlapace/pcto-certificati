begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin');
create type public.certificate_type as enum ('pcto', 'volontariato');
create type public.request_status as enum (
  'submitted',
  'approved',
  'rejected',
  'completed',
  'delivery_failed',
  'cancelled'
);
create type public.request_actor_type as enum ('system', 'coordinator', 'admin');
create type public.email_recipient_type as enum ('coordinator', 'student', 'school', 'teacher');
create type public.email_delivery_status as enum ('pending', 'sent', 'failed');

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint school_years_label_not_blank check (btrim(label) <> ''),
  constraint school_years_valid_range check (starts_on < ends_on)
);

create unique index school_years_label_key on public.school_years (label);
create unique index school_years_single_active_key
  on public.school_years (is_active)
  where is_active = true;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  short_name text not null,
  full_name text not null,
  school_email text,
  teacher_name text,
  teacher_email text,
  send_certificate_to_school_by_default boolean not null default true,
  send_certificate_to_teacher_by_default boolean not null default true,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint schools_short_name_not_blank check (btrim(short_name) <> ''),
  constraint schools_full_name_not_blank check (btrim(full_name) <> '')
);

create unique index schools_short_name_key on public.schools (lower(short_name));
create unique index schools_full_name_key on public.schools (lower(full_name));
create index schools_is_active_idx on public.schools (is_active);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekday text not null,
  start_time time,
  end_time time,
  schedule_label text not null,
  address text not null,
  city text not null default 'Roma',
  certificate_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint services_name_not_blank check (btrim(name) <> ''),
  constraint services_weekday_not_blank check (btrim(weekday) <> ''),
  constraint services_schedule_label_not_blank check (btrim(schedule_label) <> ''),
  constraint services_address_not_blank check (btrim(address) <> ''),
  constraint services_city_not_blank check (btrim(city) <> ''),
  constraint services_time_range_valid check (
    start_time is null
    or end_time is null
    or start_time < end_time
  )
);

create unique index services_name_key on public.services (lower(name));
create index services_is_active_idx on public.services (is_active);

create table public.coordinators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coordinators_first_name_not_blank check (btrim(first_name) <> ''),
  constraint coordinators_last_name_not_blank check (btrim(last_name) <> ''),
  constraint coordinators_email_not_blank check (btrim(email) <> '')
);

create unique index coordinators_email_key on public.coordinators (lower(email));
create index coordinators_auth_user_id_idx on public.coordinators (auth_user_id);
create index coordinators_is_active_idx on public.coordinators (is_active);

create table public.service_coordinators (
  service_id uuid not null references public.services(id) on delete cascade,
  coordinator_id uuid not null references public.coordinators(id) on delete cascade,
  is_primary boolean not null default false,
  receives_new_request_notifications boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (service_id, coordinator_id)
);

create index service_coordinators_coordinator_idx on public.service_coordinators (coordinator_id);
create unique index service_coordinators_one_primary_per_service_key
  on public.service_coordinators (service_id)
  where is_primary = true;

create table public.user_roles (
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role)
);

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  certificate_type public.certificate_type not null,
  status public.request_status not null default 'submitted',
  student_first_name text not null,
  student_last_name text not null,
  student_email text not null,
  class_label text not null,
  hours_requested integer,
  hours_approved integer,
  student_notes text,
  school_name_snapshot text not null,
  teacher_name_snapshot text,
  teacher_email_snapshot text,
  service_name_snapshot text not null,
  service_schedule_snapshot text not null,
  service_address_snapshot text not null,
  send_to_school boolean not null default false,
  send_to_teacher boolean not null default false,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by_coordinator_id uuid references public.coordinators(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  decision_notes text,
  coordinator_notified_at timestamptz,
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  student_emailed_at timestamptz,
  school_emailed_at timestamptz,
  teacher_emailed_at timestamptz,
  duplicate_of_request_id uuid references public.certificate_requests(id) on delete set null,
  submission_ip_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint certificate_requests_student_first_name_not_blank check (btrim(student_first_name) <> ''),
  constraint certificate_requests_student_last_name_not_blank check (btrim(student_last_name) <> ''),
  constraint certificate_requests_student_email_not_blank check (btrim(student_email) <> ''),
  constraint certificate_requests_class_label_not_blank check (btrim(class_label) <> ''),
  constraint certificate_requests_school_name_snapshot_not_blank check (btrim(school_name_snapshot) <> ''),
  constraint certificate_requests_service_name_snapshot_not_blank check (btrim(service_name_snapshot) <> ''),
  constraint certificate_requests_service_schedule_snapshot_not_blank check (btrim(service_schedule_snapshot) <> ''),
  constraint certificate_requests_service_address_snapshot_not_blank check (btrim(service_address_snapshot) <> ''),
  constraint certificate_requests_hours_requested_positive check (
    hours_requested is null or hours_requested > 0
  ),
  constraint certificate_requests_hours_approved_positive check (
    hours_approved is null or hours_approved > 0
  ),
  constraint certificate_requests_rejection_reason_when_rejected check (
    status <> 'rejected' or rejection_reason is not null
  ),
  constraint certificate_requests_reviewed_by_when_reviewed check (
    reviewed_at is null or reviewed_by_coordinator_id is not null
  )
);

create unique index certificate_requests_active_dedupe_key
  on public.certificate_requests (
    school_year_id,
    lower(student_email),
    service_id,
    certificate_type
  )
  where status in ('submitted', 'approved', 'completed', 'delivery_failed');

create index certificate_requests_status_idx
  on public.certificate_requests (status, submitted_at desc);
create index certificate_requests_service_status_idx
  on public.certificate_requests (service_id, status, submitted_at desc);
create index certificate_requests_school_year_idx
  on public.certificate_requests (school_year_id);
create index certificate_requests_school_idx
  on public.certificate_requests (school_id);
create index certificate_requests_reviewed_by_idx
  on public.certificate_requests (reviewed_by_coordinator_id);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.certificate_requests(id) on delete cascade,
  actor_type public.request_actor_type not null,
  actor_user_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint request_events_event_type_not_blank check (btrim(event_type) <> '')
);

create index request_events_request_id_created_at_idx
  on public.request_events (request_id, created_at desc);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.certificate_requests(id) on delete cascade,
  recipient_type public.email_recipient_type not null,
  recipient_email text not null,
  template_key text not null,
  status public.email_delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  provider_message_id text,
  error_message text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint email_deliveries_recipient_email_not_blank check (btrim(recipient_email) <> ''),
  constraint email_deliveries_template_key_not_blank check (btrim(template_key) <> ''),
  constraint email_deliveries_attempt_count_non_negative check (attempt_count >= 0)
);

create index email_deliveries_request_id_idx
  on public.email_deliveries (request_id, created_at desc);
create index email_deliveries_status_idx
  on public.email_deliveries (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_coordinator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.coordinators
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.can_access_service(target_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.service_coordinators sc
      join public.coordinators c
        on c.id = sc.coordinator_id
      where sc.service_id = target_service_id
        and c.auth_user_id = auth.uid()
        and c.is_active = true
    );
$$;

create or replace function public.can_access_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.certificate_requests cr
    where cr.id = target_request_id
      and public.can_access_service(cr.service_id)
  );
$$;

create or replace function public.enforce_active_service_has_coordinator()
returns trigger
language plpgsql
as $$
declare
  violating_service uuid;
begin
  select s.id
  into violating_service
  from public.services s
  where s.is_active = true
    and not exists (
      select 1
      from public.service_coordinators sc
      join public.coordinators c
        on c.id = sc.coordinator_id
      where sc.service_id = s.id
        and c.is_active = true
    )
  limit 1;

  if violating_service is not null then
    raise exception using
      message = format(
        'Each active service must have at least one active coordinator. Violating service id: %s',
        violating_service
      );
  end if;

  return null;
end;
$$;

create trigger set_updated_at_on_school_years
before update on public.school_years
for each row
execute function public.set_updated_at();

create trigger set_updated_at_on_schools
before update on public.schools
for each row
execute function public.set_updated_at();

create trigger set_updated_at_on_services
before update on public.services
for each row
execute function public.set_updated_at();

create trigger set_updated_at_on_coordinators
before update on public.coordinators
for each row
execute function public.set_updated_at();

create trigger set_updated_at_on_certificate_requests
before update on public.certificate_requests
for each row
execute function public.set_updated_at();

create constraint trigger ensure_service_has_coordinator_on_service_coordinators
after insert or update or delete on public.service_coordinators
deferrable initially deferred
for each row
execute function public.enforce_active_service_has_coordinator();

create constraint trigger ensure_service_has_coordinator_on_services
after insert or update or delete on public.services
deferrable initially deferred
for each row
execute function public.enforce_active_service_has_coordinator();

create constraint trigger ensure_service_has_coordinator_on_coordinators
after update or delete on public.coordinators
deferrable initially deferred
for each row
execute function public.enforce_active_service_has_coordinator();

alter table public.school_years enable row level security;
alter table public.schools enable row level security;
alter table public.services enable row level security;
alter table public.coordinators enable row level security;
alter table public.service_coordinators enable row level security;
alter table public.user_roles enable row level security;
alter table public.certificate_requests enable row level security;
alter table public.request_events enable row level security;
alter table public.email_deliveries enable row level security;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_coordinator_id() to authenticated;
grant execute on function public.can_access_service(uuid) to authenticated;
grant execute on function public.can_access_request(uuid) to authenticated;

create policy "school_years_select_active_public"
  on public.school_years
  for select
  to anon, authenticated
  using (is_active = true);

create policy "school_years_admin_all"
  on public.school_years
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "schools_select_active_public"
  on public.schools
  for select
  to anon, authenticated
  using (is_active = true);

create policy "schools_admin_all"
  on public.schools
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "services_select_active_public"
  on public.services
  for select
  to anon, authenticated
  using (is_active = true);

create policy "services_select_assigned_to_coordinator"
  on public.services
  for select
  to authenticated
  using (public.can_access_service(id));

create policy "services_admin_all"
  on public.services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "coordinators_select_self"
  on public.coordinators
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "coordinators_admin_all"
  on public.coordinators
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "service_coordinators_select_assigned"
  on public.service_coordinators
  for select
  to authenticated
  using (
    public.is_admin()
    or coordinator_id = public.current_coordinator_id()
    or public.can_access_service(service_id)
  );

create policy "service_coordinators_admin_all"
  on public.service_coordinators
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_roles_admin_all"
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "certificate_requests_select_assigned"
  on public.certificate_requests
  for select
  to authenticated
  using (public.can_access_service(service_id));

create policy "certificate_requests_update_assigned"
  on public.certificate_requests
  for update
  to authenticated
  using (public.can_access_service(service_id))
  with check (public.can_access_service(service_id));

create policy "certificate_requests_admin_all"
  on public.certificate_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "request_events_select_assigned"
  on public.request_events
  for select
  to authenticated
  using (public.can_access_request(request_id));

create policy "request_events_admin_all"
  on public.request_events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "email_deliveries_select_assigned"
  on public.email_deliveries
  for select
  to authenticated
  using (public.can_access_request(request_id));

create policy "email_deliveries_admin_all"
  on public.email_deliveries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.school_years (label, starts_on, ends_on, is_active)
values ('2025/2026', date '2025-09-01', date '2026-06-30', true)
on conflict (label) do update
set
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

commit;
