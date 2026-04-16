begin;

alter table public.certificate_requests
  add column certificate_heading_text text,
  add column certificate_body_text text;

commit;
