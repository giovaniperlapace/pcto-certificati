begin;

-- Ripristina un anno scolastico attivo coerente per ambiente locale.
update public.school_years
set is_active = false
where label <> '2025/2026'
  and is_active = true;

insert into public.school_years (
  id,
  label,
  starts_on,
  ends_on,
  is_active
)
values
  (
    '00000000-0000-0000-0000-000000000026',
    '2025/2026',
    date '2025-09-01',
    date '2026-06-30',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000027',
    '2026/2027',
    date '2026-09-01',
    date '2027-06-30',
    false
  )
on conflict (label) do update
set
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

-- Reset dataset seed per permettere riesecuzioni pulite.
delete from public.request_events
where request_id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000005',
  '40000000-0000-0000-0000-000000000006'
);

delete from public.email_deliveries
where request_id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000005',
  '40000000-0000-0000-0000-000000000006'
);

delete from public.certificate_requests
where id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000005',
  '40000000-0000-0000-0000-000000000006'
);

delete from public.service_coordinators
where service_id in (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004'
)
or coordinator_id in (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004'
);

delete from public.services
where id in (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004'
);

delete from public.coordinators
where id in (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004'
);

delete from public.schools
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

insert into public.schools (
  id,
  short_name,
  full_name,
  school_email,
  teacher_name,
  teacher_email,
  send_certificate_to_school_by_default,
  send_certificate_to_teacher_by_default,
  is_active,
  notes
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '[SEED] Liceo Galileo',
    '[SEED] Liceo Scientifico Galileo Galilei',
    'segreteria.galileo@seed.gxp.local',
    'Prof.ssa Martina Rizzi',
    'martina.rizzi@seed.gxp.local',
    true,
    true,
    true,
    'Scuola seed locale per QA.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '[SEED] ITIS Fermi',
    '[SEED] Istituto Tecnico Industriale Enrico Fermi',
    'certificati.fermi@seed.gxp.local',
    null,
    null,
    true,
    false,
    true,
    'Scuola seed con invio docente disattivato.'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '[SEED] IIS Pascal',
    '[SEED] Istituto di Istruzione Superiore Blaise Pascal',
    null,
    'Prof. Luca Bianchi',
    'luca.bianchi@seed.gxp.local',
    false,
    true,
    true,
    'Scuola seed senza email scuola per test edge-case.'
  );

insert into public.coordinators (
  id,
  auth_user_id,
  first_name,
  last_name,
  email,
  phone,
  is_active
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    null,
    'Chiara',
    'Rossi',
    'chiara.rossi+seed@gxp.local',
    '+39 340 1111111',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    null,
    'Marco',
    'Verdi',
    'marco.verdi+seed@gxp.local',
    '+39 340 2222222',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    null,
    'Sara',
    'Neri',
    'sara.neri+seed@gxp.local',
    '+39 340 3333333',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    null,
    'Davide',
    'Gallo',
    'davide.gallo+seed@gxp.local',
    '+39 340 4444444',
    true
  );

insert into public.services (
  id,
  name,
  weekday,
  start_time,
  end_time,
  schedule_label,
  address,
  city,
  certificate_label,
  is_active
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '[SEED] Doposcuola Trastevere',
    'Lunedi',
    time '16:00',
    time '18:00',
    '16:00 - 18:00',
    'Via della Lungaretta 10',
    'Roma',
    'PCTO',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '[SEED] Mensa Solidale Centro',
    'Mercoledi',
    time '18:30',
    time '21:00',
    '18:30 - 21:00',
    'Via Giulia 25',
    'Roma',
    'Volontariato',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '[SEED] Visite Anziani Appia',
    'Venerdi',
    time '15:30',
    time '17:30',
    '15:30 - 17:30',
    'Via Appia Nuova 120',
    'Roma',
    'PCTO',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '[SEED] Distribuzione Coperte Termini',
    'Sabato',
    time '20:00',
    time '22:30',
    '20:00 - 22:30',
    'Piazza dei Cinquecento',
    'Roma',
    'Volontariato',
    true
  );

insert into public.service_coordinators (
  service_id,
  coordinator_id,
  is_primary,
  receives_new_request_notifications
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    true,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    false,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    true,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    false,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    true,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000004',
    true,
    true
  )
on conflict (service_id, coordinator_id) do update
set
  is_primary = excluded.is_primary,
  receives_new_request_notifications = excluded.receives_new_request_notifications;

insert into public.certificate_requests (
  id,
  school_year_id,
  service_id,
  school_id,
  certificate_type,
  status,
  student_first_name,
  student_last_name,
  student_email,
  class_label,
  hours_requested,
  hours_approved,
  student_notes,
  school_name_snapshot,
  teacher_name_snapshot,
  teacher_email_snapshot,
  service_name_snapshot,
  service_schedule_snapshot,
  service_address_snapshot,
  send_to_school,
  send_to_teacher,
  submitted_at,
  reviewed_at,
  reviewed_by_coordinator_id,
  approved_at,
  rejected_at,
  rejection_reason,
  decision_notes,
  pdf_storage_path,
  pdf_generated_at,
  student_emailed_at,
  school_emailed_at,
  teacher_emailed_at,
  submission_ip_hash,
  created_at,
  updated_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'pcto',
    'submitted',
    'Giulia',
    'Conti',
    'giulia.conti+seed1@student.gxp.local',
    '4B',
    40,
    null,
    'Richiesta seed in stato submitted.',
    '[SEED] Liceo Scientifico Galileo Galilei',
    'Prof.ssa Martina Rizzi',
    'martina.rizzi@seed.gxp.local',
    '[SEED] Doposcuola Trastevere',
    'Lunedi - 16:00 - 18:00',
    'Via della Lungaretta 10, Roma',
    true,
    true,
    timestamptz '2026-04-18 08:30:00+00',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'seed-ip-hash-1',
    timestamptz '2026-04-18 08:30:00+00',
    timestamptz '2026-04-18 08:30:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'volontariato',
    'approved',
    'Lorenzo',
    'De Santis',
    'lorenzo.desantis+seed2@student.gxp.local',
    '5A',
    null,
    null,
    'Richiesta seed approvata in attesa di PDF.',
    '[SEED] Istituto Tecnico Industriale Enrico Fermi',
    null,
    null,
    '[SEED] Mensa Solidale Centro',
    'Mercoledi - 18:30 - 21:00',
    'Via Giulia 25, Roma',
    true,
    false,
    timestamptz '2026-04-17 09:15:00+00',
    timestamptz '2026-04-17 12:00:00+00',
    '30000000-0000-0000-0000-000000000002',
    timestamptz '2026-04-17 12:00:00+00',
    null,
    null,
    'Approvata, pronta per generazione PDF.',
    null,
    null,
    null,
    null,
    null,
    'seed-ip-hash-2',
    timestamptz '2026-04-17 09:15:00+00',
    timestamptz '2026-04-17 12:00:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'pcto',
    'rejected',
    'Marta',
    'Leoni',
    'marta.leoni+seed3@student.gxp.local',
    '3C',
    25,
    null,
    'Richiesta seed rifiutata con motivazione.',
    '[SEED] Istituto di Istruzione Superiore Blaise Pascal',
    'Prof. Luca Bianchi',
    'luca.bianchi@seed.gxp.local',
    '[SEED] Visite Anziani Appia',
    'Venerdi - 15:30 - 17:30',
    'Via Appia Nuova 120, Roma',
    false,
    false,
    timestamptz '2026-04-16 10:20:00+00',
    timestamptz '2026-04-16 11:40:00+00',
    '30000000-0000-0000-0000-000000000003',
    null,
    timestamptz '2026-04-16 11:40:00+00',
    'Ore richieste non coerenti con il registro presenze del servizio.',
    'Da reinviare con dettaglio ore verificato.',
    null,
    null,
    null,
    null,
    null,
    'seed-ip-hash-3',
    timestamptz '2026-04-16 10:20:00+00',
    timestamptz '2026-04-16 11:40:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'pcto',
    'completed',
    'Alessia',
    'Greco',
    'alessia.greco+seed4@student.gxp.local',
    '4A',
    35,
    35,
    'Richiesta seed completata con invio studente e scuola.',
    '[SEED] Liceo Scientifico Galileo Galilei',
    'Prof.ssa Martina Rizzi',
    'martina.rizzi@seed.gxp.local',
    '[SEED] Doposcuola Trastevere',
    'Lunedi - 16:00 - 18:00',
    'Via della Lungaretta 10, Roma',
    true,
    false,
    timestamptz '2026-04-15 09:05:00+00',
    timestamptz '2026-04-15 10:30:00+00',
    '30000000-0000-0000-0000-000000000001',
    timestamptz '2026-04-15 10:30:00+00',
    null,
    null,
    'Flusso completato.',
    'certificate-requests/40000000-0000-0000-0000-000000000004/certificato-pcto-greco-alessia.pdf',
    timestamptz '2026-04-15 10:45:00+00',
    timestamptz '2026-04-15 11:00:00+00',
    timestamptz '2026-04-15 11:01:00+00',
    null,
    'seed-ip-hash-4',
    timestamptz '2026-04-15 09:05:00+00',
    timestamptz '2026-04-15 11:01:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'volontariato',
    'delivery_failed',
    'Tommaso',
    'Rinaldi',
    'tommaso.rinaldi+seed5@student.gxp.local',
    '5D',
    null,
    null,
    'Richiesta seed con fallimento consegna per email docente mancante.',
    '[SEED] Istituto Tecnico Industriale Enrico Fermi',
    null,
    null,
    '[SEED] Distribuzione Coperte Termini',
    'Sabato - 20:00 - 22:30',
    'Piazza dei Cinquecento, Roma',
    false,
    true,
    timestamptz '2026-04-14 18:20:00+00',
    timestamptz '2026-04-14 19:10:00+00',
    '30000000-0000-0000-0000-000000000004',
    timestamptz '2026-04-14 19:10:00+00',
    null,
    null,
    'Errore consegna: docente non configurato.',
    'certificate-requests/40000000-0000-0000-0000-000000000005/certificato-volontariato-rinaldi-tommaso.pdf',
    timestamptz '2026-04-14 19:18:00+00',
    timestamptz '2026-04-14 19:25:00+00',
    null,
    null,
    'seed-ip-hash-5',
    timestamptz '2026-04-14 18:20:00+00',
    timestamptz '2026-04-14 19:26:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'volontariato',
    'cancelled',
    'Irene',
    'Fontana',
    'irene.fontana+seed6@student.gxp.local',
    '2E',
    null,
    null,
    'Richiesta annullata in modo amministrativo.',
    '[SEED] Liceo Scientifico Galileo Galilei',
    'Prof.ssa Martina Rizzi',
    'martina.rizzi@seed.gxp.local',
    '[SEED] Mensa Solidale Centro',
    'Mercoledi - 18:30 - 21:00',
    'Via Giulia 25, Roma',
    false,
    false,
    timestamptz '2026-04-13 08:10:00+00',
    null,
    null,
    null,
    null,
    null,
    'Annullata da admin per richiesta duplicata offline.',
    null,
    null,
    null,
    null,
    null,
    'seed-ip-hash-6',
    timestamptz '2026-04-13 08:10:00+00',
    timestamptz '2026-04-13 09:00:00+00'
  );

insert into public.request_events (
  id,
  request_id,
  actor_type,
  actor_user_id,
  event_type,
  payload,
  created_at
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'system',
    null,
    'request_submitted',
    '{"source":"seed"}'::jsonb,
    timestamptz '2026-04-18 08:30:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'system',
    null,
    'coordinator_notifications_queued',
    '{"source":"seed","recipients":2}'::jsonb,
    timestamptz '2026-04-18 08:31:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000004',
    'coordinator',
    null,
    'request_approved',
    '{"source":"seed"}'::jsonb,
    timestamptz '2026-04-15 10:30:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000004',
    'system',
    null,
    'certificate_pdf_generated',
    '{"source":"seed"}'::jsonb,
    timestamptz '2026-04-15 10:45:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000004',
    'system',
    null,
    'certificate_delivery_completed',
    '{"source":"seed"}'::jsonb,
    timestamptz '2026-04-15 11:01:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000005',
    'coordinator',
    null,
    'request_approved',
    '{"source":"seed"}'::jsonb,
    timestamptz '2026-04-14 19:10:00+00'
  ),
  (
    '50000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000005',
    'system',
    null,
    'certificate_delivery_failed',
    '{"source":"seed","reason":"missing_teacher_email"}'::jsonb,
    timestamptz '2026-04-14 19:26:00+00'
  )
on conflict (id) do update
set
  request_id = excluded.request_id,
  actor_type = excluded.actor_type,
  actor_user_id = excluded.actor_user_id,
  event_type = excluded.event_type,
  payload = excluded.payload,
  created_at = excluded.created_at;

insert into public.email_deliveries (
  id,
  request_id,
  recipient_type,
  recipient_email,
  template_key,
  status,
  attempt_count,
  provider_message_id,
  error_message,
  last_attempt_at,
  sent_at,
  created_at
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'student',
    'alessia.greco+seed4@student.gxp.local',
    'certificate_student',
    'sent',
    1,
    'seed-msg-student-1',
    null,
    timestamptz '2026-04-15 11:00:00+00',
    timestamptz '2026-04-15 11:00:00+00',
    timestamptz '2026-04-15 11:00:00+00'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000004',
    'school',
    'segreteria.galileo@seed.gxp.local',
    'certificate_school',
    'sent',
    1,
    'seed-msg-school-1',
    null,
    timestamptz '2026-04-15 11:01:00+00',
    timestamptz '2026-04-15 11:01:00+00',
    timestamptz '2026-04-15 11:01:00+00'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000005',
    'teacher',
    '(non disponibile)',
    'certificate_teacher',
    'failed',
    0,
    null,
    'La richiesta prevede l''invio al docente ma non esiste un''email docente disponibile.',
    timestamptz '2026-04-14 19:26:00+00',
    null,
    timestamptz '2026-04-14 19:26:00+00'
  )
on conflict (id) do update
set
  request_id = excluded.request_id,
  recipient_type = excluded.recipient_type,
  recipient_email = excluded.recipient_email,
  template_key = excluded.template_key,
  status = excluded.status,
  attempt_count = excluded.attempt_count,
  provider_message_id = excluded.provider_message_id,
  error_message = excluded.error_message,
  last_attempt_at = excluded.last_attempt_at,
  sent_at = excluded.sent_at,
  created_at = excluded.created_at;

commit;
