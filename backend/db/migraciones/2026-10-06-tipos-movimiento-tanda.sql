-- Fase 18.7: nuevos tipos de movimiento de créditos para las tandas.
--
-- Hibernate genera un CHECK sobre la columna de enum al crear la tabla, pero
-- `ddl-auto: update` NO actualiza ese CHECK cuando se agregan valores al enum
-- TipoMovimiento. Sin este script, insertar un Consumo_Tanda falla.
--
-- Aplicar una vez sobre la base (idempotente):
--   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/2026-10-06-tipos-movimiento-tanda.sql

ALTER TABLE movimientos_credito
    DROP CONSTRAINT IF EXISTS movimientos_credito_tipo_movimiento_check;

ALTER TABLE movimientos_credito
    ADD CONSTRAINT movimientos_credito_tipo_movimiento_check
    CHECK (tipo_movimiento IN (
        'Bienvenida',
        'Recarga',
        'Consumo_Publicacion',
        'Consumo_Tanda',
        'Devolucion_Tanda'
    ));
