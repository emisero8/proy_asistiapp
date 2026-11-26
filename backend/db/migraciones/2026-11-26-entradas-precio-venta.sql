-- Precio con el que salió cada entrada: ingresos, rendición del Staff Vendedor y reembolsos dejan de usar el
-- precio actual de la tanda. Idempotente: solo completa las filas que no lo tienen.
-- Correrlo ANTES de cambiar precios con el backend nuevo. En las ventas online el dato sale de la orden (exacto);
-- en las de puerta y las emitidas se toma el precio que la tanda tiene al correr el script.

ALTER TABLE entradas ADD COLUMN IF NOT EXISTS precio_venta double precision;

UPDATE entradas e
SET precio_venta = round((t.monto_total / t.cantidad)::numeric, 2) - round(coalesce(t.cargo_servicio_unitario, 0)::numeric, 2)
FROM transacciones_pago t
WHERE e.precio_venta IS NULL AND e.id_transaccion_pago = t.id;

UPDATE entradas e
SET precio_venta = ta.precio
FROM tandas ta
WHERE e.precio_venta IS NULL AND e.id_tanda = ta.id;
