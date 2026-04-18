begin;

create table public.certificate_signature_settings (
  id text primary key default 'default',
  issued_in_city text not null,
  signature_image_file_name text not null,
  signer_name text not null,
  signer_role text not null,
  signer_phone text,
  signer_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint certificate_signature_settings_id_not_blank
    check (btrim(id) <> ''),
  constraint certificate_signature_settings_issued_in_city_not_blank
    check (btrim(issued_in_city) <> ''),
  constraint certificate_signature_settings_signature_image_file_name_not_blank
    check (btrim(signature_image_file_name) <> ''),
  constraint certificate_signature_settings_signer_name_not_blank
    check (btrim(signer_name) <> ''),
  constraint certificate_signature_settings_signer_role_not_blank
    check (btrim(signer_role) <> '')
);

insert into public.certificate_signature_settings (
  id,
  issued_in_city,
  signature_image_file_name,
  signer_name,
  signer_role,
  signer_phone,
  signer_email
)
values (
  'default',
  'Roma',
  'signature.png',
  'Prof. Stefano Orlando',
  'Coordinatore attivita'' giovanili',
  '328/5699419',
  'info@giovaniperlapace.it'
);

create trigger set_updated_at_on_certificate_signature_settings
before update on public.certificate_signature_settings
for each row
execute function public.set_updated_at();

alter table public.certificate_signature_settings enable row level security;

create policy "certificate_signature_settings_admin_all"
  on public.certificate_signature_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
