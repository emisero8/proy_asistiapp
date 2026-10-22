-- Integración MercadoPago Checkout Pro: nuevos estados de transacción.
--
-- `ddl-auto: update` agrega solas las columnas nuevas (cantidad, external_reference,
-- fecha_vencimiento) pero NO actualiza el CHECK que Hibernate generó sobre `estado`
-- al sumar Expirada y Reembolsada al enum EstadoTransaccion. Sin este script, marcar
-- una orden como vencida o reembolsada falla.
--
-- Aplicar una vez sobre la base (idempotente):
--   psql -h localhost -U postgres -d asistiapp_db -f db/migraciones/2026-10-15-mercadopago-ordenes.sql

ALTER TABLE transacciones_pago DROP CONSTRAINT IF EXISTS transacciones_pago_estado_check;
ALTER TABLE transacciones_pago
    ADD CONSTRAINT transacciones_pago_estado_check
    CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Expirada', 'Reembolsada'));

ALTER TABLE transacciones_credito DROP CONSTRAINT IF EXISTS transacciones_credito_estado_check;
ALTER TABLE transacciones_credito
    ADD CONSTRAINT transacciones_credito_estado_check
    CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Expirada', 'Reembolsada'));

-- Filas previas a la integración: cantidad 1 (columna nueva puede quedar null si update no aplicó el default).
UPDATE transacciones_pago SET cantidad = 1 WHERE cantidad IS NULL;
