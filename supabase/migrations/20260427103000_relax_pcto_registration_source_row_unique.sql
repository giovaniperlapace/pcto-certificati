begin;

-- Registration rows are identified by the stable student Code inside the
-- school year. The sheet row number can change when the Google Sheet is sorted
-- or edited, so it must remain import metadata rather than a uniqueness key.
drop index if exists public.pcto_student_registrations_source_row_key;

commit;
