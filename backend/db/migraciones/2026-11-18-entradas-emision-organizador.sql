-- Entradas que emite el Organizador (cortesía o pago por fuera de la plataforma), ítem 8.2 del plan de mejoras.
-- Con ddl-auto=update el backend crea estas columnas solo al arrancar; este script es para bases donde
-- se aplican las migraciones a mano. Es idempotente y no toca los datos existentes (todas quedan en NULL).
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS id_organizador_emisor BIGINT;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS tipo_emision VARCHAR(20);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS motivo_emision VARCHAR(200);
