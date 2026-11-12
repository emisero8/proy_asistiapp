-- Anuncios globales (CU-028): `log_auditoria.id_entidad_afectada` pasa a ser opcional.
--
-- Una acción de alcance global (ej. el anuncio a todos los usuarios) no tiene una única entidad
-- afectada, así que `AuditoriaAspect` guarda NULL. La entidad `LogAuditoria` ya no declara la
-- columna como NOT NULL, pero `ddl-auto: update` NO relaja constraints de tablas ya creadas: en
-- cualquier base creada antes del 2026-10-22, publicar un anuncio global devuelve 500
-- (ConstraintViolationException).
--
-- Aplicar una vez sobre la base (idempotente):
--   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/2026-10-22-log-auditoria-entidad-nullable.sql

ALTER TABLE log_auditoria ALTER COLUMN id_entidad_afectada DROP NOT NULL;
