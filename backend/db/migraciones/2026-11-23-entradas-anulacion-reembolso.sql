-- 8.6 Anular entradas y reembolsar compras.
--
-- Hibernate (ddl-auto: update) agrega las columnas nuevas solo, pero NO actualiza el CHECK que generó sobre la
-- columna de enum al crear la tabla: sin el cambio de abajo, anular una entrada (estado 'Anulada') falla.
-- Idempotente: se puede aplicar más de una vez.

ALTER TABLE entradas ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(200);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS reembolsada_en TIMESTAMP;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS reembolso_en_curso BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS credito_devuelto BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE entradas DROP CONSTRAINT IF EXISTS entradas_estado_check;
ALTER TABLE entradas
    ADD CONSTRAINT entradas_estado_check
    CHECK (estado IN ('Pagada', 'Usada', 'Anulada'));
