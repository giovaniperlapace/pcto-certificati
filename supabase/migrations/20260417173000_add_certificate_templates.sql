begin;

create table public.certificate_templates (
  certificate_type public.certificate_type primary key,
  heading_template text not null,
  body_template text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint certificate_templates_heading_template_not_blank
    check (btrim(heading_template) <> ''),
  constraint certificate_templates_body_template_not_blank
    check (btrim(body_template) <> '')
);

insert into public.certificate_templates (
  certificate_type,
  heading_template,
  body_template
)
values
  (
    'pcto',
    'OGGETTO: Attestazione attività di PCTO con la Comunità di Sant''Egidio',
    E'Il sottoscritto Stefano Orlando, in qualità di responsabile delle attività giovanili della Comunità di Sant''Egidio, certifica che lo/la studente {{student_full_name}}, della classe {{class_label}} dell''istituto denominato "{{school_name}}", nell''anno scolastico {{school_year}} ha partecipato ad un percorso di PCTO con la Comunità di Sant''Egidio con delle attività in favore delle persone vulnerabili o in stato di disagio a Roma, per un totale di {{approved_hours}} ore di servizio.\n\nLe attività si sono svolte presso {{service_name}}, nella sede di {{service_address}}, con calendario {{service_schedule}}.\n\nQuesto documento è rilasciato come attestazione del contributo significativo e dell''impegno mostrato dall''individuo nelle attività svolte.'
  ),
  (
    'volontariato',
    'OGGETTO: Attestazione attività di volontariato con la Comunità di Sant''Egidio',
    E'Il sottoscritto Stefano Orlando, in qualità di responsabile delle attività giovanili della Comunità di Sant''Egidio, certifica che lo/la studente {{student_full_name}}, della classe "{{class_label}}", dell''istituto denominato "{{school_name}}", nell''anno scolastico {{school_year}} ha partecipato alle attività di volontariato condotte dalla Comunità di Sant''Egidio in favore delle persone vulnerabili o in stato di disagio a Roma{{volunteer_hours_clause}}, nella sede di {{service_name}}, {{service_address}}.\n\nLe attività si sono svolte con calendario {{service_schedule}}.\n\nQuesto documento è rilasciato come attestazione del contributo significativo e dell''impegno mostrato dall''individuo nelle attività svolte.'
  );

create trigger set_updated_at_on_certificate_templates
before update on public.certificate_templates
for each row
execute function public.set_updated_at();

alter table public.certificate_templates enable row level security;

create policy "certificate_templates_admin_all"
  on public.certificate_templates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
