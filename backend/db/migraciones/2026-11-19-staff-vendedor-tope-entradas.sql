-- 8.3 Tope de entradas por Staff Vendedor.
-- NULL = vendedor creado antes de la regla (sin tope); el alta nueva siempre lo exige.
ALTER TABLE staff_vendedores ADD COLUMN IF NOT EXISTS tope_entradas INTEGER;
