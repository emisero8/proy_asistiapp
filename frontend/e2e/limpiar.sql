-- Borra todo lo que creó la suite e2e (cuentas "e2e.*@asistiapp.test" y lo que cuelga de ellas).
-- Uso:  psql -U postgres -d asistiapp_db -f e2e/limpiar.sql
-- Es solo para la base local de desarrollo. Corre en una transacción: si algo falla no borra nada.
BEGIN;

CREATE TEMP TABLE e2e_usuarios AS SELECT id FROM usuarios WHERE email LIKE 'e2e.%@asistiapp.test';
CREATE TEMP TABLE e2e_eventos  AS SELECT id FROM eventos WHERE id_organizador IN (SELECT id FROM e2e_usuarios);
CREATE TEMP TABLE e2e_tandas   AS SELECT id FROM tandas WHERE id_evento IN (SELECT id FROM e2e_eventos);

DELETE FROM entradas WHERE id_tanda IN (SELECT id FROM e2e_tandas);
DELETE FROM transacciones_pago WHERE id_tanda IN (SELECT id FROM e2e_tandas);
DELETE FROM tandas WHERE id IN (SELECT id FROM e2e_tandas);
DELETE FROM movimientos_credito WHERE id_organizador IN (SELECT id FROM e2e_usuarios) OR id_evento IN (SELECT id FROM e2e_eventos);
DELETE FROM transacciones_credito WHERE id_organizador IN (SELECT id FROM e2e_usuarios);
DELETE FROM eventos WHERE id IN (SELECT id FROM e2e_eventos);
DELETE FROM staff_qr WHERE id_usuario IN (SELECT id FROM e2e_usuarios);
DELETE FROM staff_vendedores WHERE id_usuario IN (SELECT id FROM e2e_usuarios) OR id_organizador IN (SELECT id FROM e2e_usuarios);
DELETE FROM notificaciones WHERE id_usuario_destino IN (SELECT id FROM e2e_usuarios);
DELETE FROM tokens_recuperacion WHERE id_usuario IN (SELECT id FROM e2e_usuarios);
-- La auditoría es inmutable en la app, pero lo que hizo la suite (publicar, vender, escanear) es ruido de prueba.
DELETE FROM log_auditoria WHERE id_emisor IN (SELECT id FROM e2e_usuarios);
DELETE FROM organizadores WHERE id_usuario IN (SELECT id FROM e2e_usuarios);
DELETE FROM usuarios WHERE id IN (SELECT id FROM e2e_usuarios);

COMMIT;
