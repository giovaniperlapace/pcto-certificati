begin;

create table public.pcto_student_registrations (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  source_spreadsheet_id text not null,
  source_sheet_name text not null default 'Iscritti',
  source_row_number integer not null,
  source_code text not null,
  duplicate_code text,
  registration_submitted_at timestamptz,
  student_first_name text not null,
  student_last_name text not null,
  display_name text,
  school_name text,
  registration_status text,
  waiting_list_position integer,
  assigned_service_name text,
  attendance_count integer,
  class_year text,
  class_section text,
  teacher_name text,
  student_phone text,
  student_email text,
  student_address text,
  certificate_type public.certificate_type not null default 'pcto',
  friend_preferences text,
  unavailable_days text,
  student_notes text,
  internal_notes text,
  registry_confirmed boolean,
  invitation_sent boolean,
  duplicate_marker text,
  raw_data jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pcto_student_registrations_source_spreadsheet_not_blank check (btrim(source_spreadsheet_id) <> ''),
  constraint pcto_student_registrations_source_sheet_not_blank check (btrim(source_sheet_name) <> ''),
  constraint pcto_student_registrations_source_row_positive check (source_row_number > 1),
  constraint pcto_student_registrations_source_code_not_blank check (btrim(source_code) <> ''),
  constraint pcto_student_registrations_first_name_not_blank check (btrim(student_first_name) <> ''),
  constraint pcto_student_registrations_last_name_not_blank check (btrim(student_last_name) <> ''),
  constraint pcto_student_registrations_attendance_count_non_negative check (
    attendance_count is null or attendance_count >= 0
  )
);

create unique index pcto_student_registrations_school_year_code_key
  on public.pcto_student_registrations (school_year_id, source_code);
create unique index pcto_student_registrations_source_row_key
  on public.pcto_student_registrations (source_spreadsheet_id, source_sheet_name, source_row_number);
create index pcto_student_registrations_school_year_idx
  on public.pcto_student_registrations (school_year_id);
create index pcto_student_registrations_status_idx
  on public.pcto_student_registrations (registration_status);
create index pcto_student_registrations_service_idx
  on public.pcto_student_registrations (assigned_service_name);
create index pcto_student_registrations_student_name_idx
  on public.pcto_student_registrations (lower(student_last_name), lower(student_first_name));

create table public.pcto_attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete restrict,
  student_registration_id uuid references public.pcto_student_registrations(id) on delete set null,
  source_spreadsheet_id text not null,
  source_sheet_name text not null default 'Presenze',
  source_row_number integer not null,
  source_code text not null,
  submitted_at timestamptz,
  student_first_name text,
  student_last_name text,
  service_name text,
  service_date date,
  check_in_time time,
  check_out_time time,
  duration_minutes integer,
  notes text,
  raw_data jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pcto_attendance_records_source_spreadsheet_not_blank check (btrim(source_spreadsheet_id) <> ''),
  constraint pcto_attendance_records_source_sheet_not_blank check (btrim(source_sheet_name) <> ''),
  constraint pcto_attendance_records_source_row_positive check (source_row_number > 1),
  constraint pcto_attendance_records_source_code_not_blank check (btrim(source_code) <> ''),
  constraint pcto_attendance_records_duration_non_negative check (
    duration_minutes is null or duration_minutes >= 0
  )
);

create unique index pcto_attendance_records_source_row_key
  on public.pcto_attendance_records (source_spreadsheet_id, source_sheet_name, source_row_number);
create index pcto_attendance_records_school_year_idx
  on public.pcto_attendance_records (school_year_id);
create index pcto_attendance_records_student_registration_idx
  on public.pcto_attendance_records (student_registration_id);
create index pcto_attendance_records_source_code_idx
  on public.pcto_attendance_records (school_year_id, source_code);
create index pcto_attendance_records_service_date_idx
  on public.pcto_attendance_records (service_date desc);

create trigger set_updated_at_on_pcto_student_registrations
before update on public.pcto_student_registrations
for each row
execute function public.set_updated_at();

create trigger set_updated_at_on_pcto_attendance_records
before update on public.pcto_attendance_records
for each row
execute function public.set_updated_at();

alter table public.pcto_student_registrations enable row level security;
alter table public.pcto_attendance_records enable row level security;

create policy "pcto_student_registrations_admin_all"
  on public.pcto_student_registrations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pcto_attendance_records_admin_all"
  on public.pcto_attendance_records
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
