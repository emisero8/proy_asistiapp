-- 8.7: cuándo y con qué versión de los Términos y la Política de Privacidad se registró cada Organizador.
-- Hibernate (ddl-auto: update) lo crea solo; este script es para bases donde se aplican los cambios a mano.
-- Idempotente. NULL = cuenta anterior a esta regla.
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS terminos_aceptados_en TIMESTAMP;
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS terminos_version VARCHAR(40);
