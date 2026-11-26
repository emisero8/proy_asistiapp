-- Auditoría legible y de todos los roles: quién hizo la acción y sobre quién, por nombre.
--
-- Desde el 2026-11-25 `log_auditoria` registra acciones del Admin, del Organizador y de su Staff:
--   - `id_admin` pasa a llamarse `id_emisor` (ya no es siempre un Admin).
--   - columnas nuevas `emisor_nombre`, `emisor_rol` y `entidad_nombre`: foto del momento, siguen
--     legibles aunque después se borre el usuario o el evento.
--   - `detalle` pasa a ser texto en lenguaje natural ("Estado: Activo → Suspendido").
--
-- Además completa las filas viejas con lo que todavía se puede saber:
--   1. `emisor_nombre`, `emisor_rol` y `entidad_nombre` desde las tablas actuales (si el registro
--      afectado ya se borró, queda NULL y la pantalla muestra solo el id).
--   2. El `detalle` técnico viejo (`suspenderUsuario([6])`, `crear([...DTO@1d18c2c0])`) no decía nada
--      que no esté en otras columnas: se reemplaza por texto legible o se vacía. El del anuncio
--      global conserva el título y el mensaje.
--   3. Las acciones sobre tandas guardaban por error el id del EVENTO en `id_entidad_afectada` (el
--      aspecto tomaba el primer parámetro Long). No se puede saber qué tanda fue: se deja el id en
--      NULL y se aclara el evento en el nombre y el detalle.
--
-- Conviene aplicarlo ANTES de arrancar el backend nuevo; si el backend ya arrancó (y Hibernate creó
-- `id_emisor` vacía al lado de `id_admin`), también funciona: copia los valores y borra la vieja.
-- Idempotente: se puede volver a correr.
--
--   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/2026-11-25-log-auditoria-legible.sql

DO $$
DECLARE
    tiene_id_admin   boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                        WHERE table_name = 'log_auditoria' AND column_name = 'id_admin');
    tiene_id_emisor  boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                        WHERE table_name = 'log_auditoria' AND column_name = 'id_emisor');
    tiene_adm_nombre boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                        WHERE table_name = 'log_auditoria' AND column_name = 'admin_nombre');
    tiene_emi_nombre boolean := EXISTS (SELECT 1 FROM information_schema.columns
                                        WHERE table_name = 'log_auditoria' AND column_name = 'emisor_nombre');
BEGIN
    IF tiene_id_admin AND NOT tiene_id_emisor THEN
        ALTER TABLE log_auditoria RENAME COLUMN id_admin TO id_emisor;
    ELSIF tiene_id_admin AND tiene_id_emisor THEN
        UPDATE log_auditoria SET id_emisor = id_admin WHERE id_emisor IS NULL;
        ALTER TABLE log_auditoria DROP COLUMN id_admin;
    END IF;

    -- `admin_nombre` existió solo en una versión intermedia de esta misma rama.
    IF tiene_adm_nombre AND NOT tiene_emi_nombre THEN
        ALTER TABLE log_auditoria RENAME COLUMN admin_nombre TO emisor_nombre;
    ELSIF tiene_adm_nombre AND tiene_emi_nombre THEN
        UPDATE log_auditoria SET emisor_nombre = admin_nombre WHERE emisor_nombre IS NULL;
        ALTER TABLE log_auditoria DROP COLUMN admin_nombre;
    END IF;
END $$;

ALTER TABLE log_auditoria ALTER COLUMN id_emisor SET NOT NULL;
ALTER TABLE log_auditoria ADD COLUMN IF NOT EXISTS emisor_nombre VARCHAR(150);
ALTER TABLE log_auditoria ADD COLUMN IF NOT EXISTS emisor_rol VARCHAR(30);
ALTER TABLE log_auditoria ADD COLUMN IF NOT EXISTS entidad_nombre VARCHAR(300);

BEGIN;

-- Filas viejas a completar: las anteriores a este cambio no tienen rol (las nuevas siempre lo traen).
CREATE TEMP TABLE auditoria_vieja ON COMMIT DROP AS
SELECT id FROM log_auditoria WHERE emisor_rol IS NULL;

-- 3. Tandas: el id guardado es el del evento. Solo filas con el detalle técnico viejo
--    (las corregidas o las nuevas no lo tienen). En el SET, id_entidad_afectada todavía vale lo viejo.
UPDATE log_auditoria l
SET entidad_nombre = 'Tanda de ' || COALESCE(
        '«' || (SELECT e.nombre FROM eventos e WHERE e.id = l.id_entidad_afectada) || '»',
        'un evento eliminado'),
    detalle = 'Registro anterior al 25/11/2026: no guardó qué tanda fue. Evento #' || l.id_entidad_afectada || '.',
    id_entidad_afectada = NULL
WHERE l.id IN (SELECT id FROM auditoria_vieja)
  AND l.entidad_afectada = 'Tanda'
  AND l.id_entidad_afectada IS NOT NULL
  AND l.detalle ~ '^[A-Za-z]+\(\[.*\]\)$';

-- 1. Emisor: nombre y rol actuales. Antes de este cambio solo se auditaba al Administrador.
UPDATE log_auditoria l
SET emisor_nombre = COALESCE(l.emisor_nombre, u.nombre)
FROM auditoria_vieja v, usuarios u
WHERE l.id = v.id AND u.id = l.id_emisor;

UPDATE log_auditoria l
SET emisor_rol = 'Administrador',
    emisor_nombre = COALESCE(l.emisor_nombre, 'Administrador eliminado')
FROM auditoria_vieja v
WHERE l.id = v.id;

-- 1. Nombre del registro afectado (si todavía existe y no se completó antes).
UPDATE log_auditoria l
SET entidad_nombre = u.nombre,
    detalle = CASE WHEN l.detalle ~ '^[A-Za-z]+\(\[.*\]\)$'
                   THEN replace(u.rol, '_', ' ') || ' · ' || u.email
                   ELSE l.detalle END
FROM auditoria_vieja v, usuarios u
WHERE l.id = v.id AND l.entidad_nombre IS NULL
  AND l.entidad_afectada = 'Usuario' AND u.id = l.id_entidad_afectada;

UPDATE log_auditoria l
SET entidad_nombre = e.nombre
FROM auditoria_vieja v, eventos e
WHERE l.id = v.id AND l.entidad_nombre IS NULL
  AND l.entidad_afectada = 'Evento' AND e.id = l.id_entidad_afectada;

UPDATE log_auditoria l
SET entidad_nombre = p.nombre
FROM auditoria_vieja v, paquetes_credito p
WHERE l.id = v.id AND l.entidad_nombre IS NULL
  AND l.entidad_afectada = 'PaqueteCredito' AND p.id = l.id_entidad_afectada;

UPDATE log_auditoria l
SET entidad_nombre = c.clave
FROM auditoria_vieja v, configuraciones_sistema c
WHERE l.id = v.id AND l.entidad_nombre IS NULL
  AND l.entidad_afectada = 'ConfiguracionSistema' AND c.id = l.id_entidad_afectada;

UPDATE log_auditoria l
SET entidad_nombre = 'Todos los usuarios activos',
    detalle = regexp_replace(l.detalle, '^crearGlobal\(\[(.*)\]\)$', 'Título y mensaje: \1')
FROM auditoria_vieja v
WHERE l.id = v.id AND l.accion = 'CREAR_ANUNCIO_GLOBAL';

-- 2. El resto del detalle técnico viejo no aporta nada legible.
UPDATE log_auditoria l
SET detalle = CASE
        WHEN l.accion = 'CAMBIAR_PASSWORD_USUARIO' THEN 'Se le asignó una contraseña nueva.'
        WHEN l.accion = 'ELIMINAR_USUARIO' THEN 'Se eliminó la cuenta definitivamente.'
        WHEN l.accion = 'ELIMINAR_EVENTO_ADMIN' THEN 'Se eliminó el evento definitivamente.'
        ELSE NULL END
FROM auditoria_vieja v
WHERE l.id = v.id AND l.detalle ~ '^[A-Za-z]+\(\[.*\]\)$';

COMMIT;
