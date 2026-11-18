-- Mi perfil: el Organizador elige quién paga la comisión de Mercado Pago (él o el comprador) y con qué plazo de
-- liberación y zona se calcula. Las órdenes guardan el cargo por entrada que se le sumó al comprador.
-- Hibernate (ddl-auto: update) crea las columnas solo; este script es para bases donde se aplican los cambios a mano.
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS trasladar_cargo_mp BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS plazo_liberacion_mp VARCHAR(20);
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS zona_comision_mp VARCHAR(30);
ALTER TABLE transacciones_pago ADD COLUMN IF NOT EXISTS cargo_servicio_unitario DOUBLE PRECISION;

-- Si Hibernate ya creó las columnas de enum, puede haber dejado un CHECK con los valores; se rehace con los vigentes.
ALTER TABLE organizadores DROP CONSTRAINT IF EXISTS organizadores_plazo_liberacion_mp_check;
ALTER TABLE organizadores ADD CONSTRAINT organizadores_plazo_liberacion_mp_check
    CHECK (plazo_liberacion_mp IS NULL OR plazo_liberacion_mp IN ('AlInstante', 'Dias10', 'Dias18', 'Dias35'));
ALTER TABLE organizadores DROP CONSTRAINT IF EXISTS organizadores_zona_comision_mp_check;
ALTER TABLE organizadores ADD CONSTRAINT organizadores_zona_comision_mp_check
    CHECK (zona_comision_mp IS NULL OR zona_comision_mp IN ('General', 'BuenosAiresEntreRiosChubut'));
