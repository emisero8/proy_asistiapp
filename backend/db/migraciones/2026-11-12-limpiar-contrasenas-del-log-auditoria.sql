-- Borra del log de auditoría las contraseñas en texto plano guardadas antes del 2026-11-12.
--
-- Hasta esa fecha, `AuditoriaAspect` escribía en `detalle` todos los argumentos del método auditado,
-- así que cada "Cambiar contraseña de un usuario" hecho por el Admin dejó la contraseña nueva en
-- texto plano, con formato `cambiarPassword([<idUsuario>, <contraseña>])`.
-- Desde el cambio, el aspecto enmascara esos argumentos (`***`); este script limpia lo viejo.
--
-- Conserva la fila (quién, cuándo y sobre qué usuario) y solo reemplaza la contraseña.
-- Idempotente: sobre una fila ya limpia no hace nada.
--
-- Aplicar una vez sobre la base:
--   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/2026-11-12-limpiar-contrasenas-del-log-auditoria.sql

UPDATE log_auditoria
SET detalle = regexp_replace(detalle, '^cambiarPassword\(\[(\d+), .*\]\)$', 'cambiarPassword([\1, ***])')
WHERE accion = 'CAMBIAR_PASSWORD_USUARIO'
  AND detalle ~ '^cambiarPassword\(\[\d+, .*\]\)$'
  AND detalle !~ '^cambiarPassword\(\[\d+, \*\*\*\]\)$';
