alter type public.email_recipient_type add value if not exists 'admin';

alter table public.certificate_requests
  alter column school_id drop not null,
  alter column service_id drop not null;

drop index if exists public.certificate_requests_active_dedupe_key;

create unique index certificate_requests_active_dedupe_key
  on public.certificate_requests (
    school_year_id,
    lower(student_email),
    service_id,
    certificate_type
  )
  where service_id is not null
    and status in ('submitted', 'approved', 'completed', 'delivery_failed');

create unique index certificate_requests_missing_service_dedupe_key
  on public.certificate_requests (
    school_year_id,
    lower(student_email),
    lower(service_name_snapshot),
    lower(service_address_snapshot),
    certificate_type
  )
  where service_id is null
    and status in ('submitted', 'approved', 'completed', 'delivery_failed');
