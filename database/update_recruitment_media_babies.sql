-- Recrutement parallèle Media Babies (stream)
ALTER TABLE recruitment_candidates
  ADD COLUMN stream VARCHAR(32) NOT NULL DEFAULT 'general' AFTER statut;

ALTER TABLE recruitment_candidates
  ADD INDEX idx_recruitment_candidates_stream (stream);

ALTER TABLE recruitment_slots
  ADD COLUMN stream VARCHAR(32) NOT NULL DEFAULT 'general' AFTER lieu;

ALTER TABLE recruitment_slots
  ADD INDEX idx_recruitment_slots_stream (stream);

-- Permet le même horaire dans chaque recrutement
ALTER TABLE recruitment_slots DROP INDEX uk_slot_datetime;
ALTER TABLE recruitment_slots
  ADD UNIQUE KEY uk_slot_datetime_stream (date_slot, heure_slot, stream);

ALTER TABLE recruitment_settings
  ADD COLUMN candidature_ouverte_media TINYINT(1) NOT NULL DEFAULT 0 AFTER candidature_ouverte,
  ADD COLUMN mail_media_confirmation_sujet VARCHAR(255) NULL AFTER mail_paiement_corps,
  ADD COLUMN mail_media_confirmation_corps TEXT NULL,
  ADD COLUMN mail_media_reussite_sujet VARCHAR(255) NULL,
  ADD COLUMN mail_media_reussite_corps TEXT NULL;
