-- 8.9 Tope de entradas por comprador configurable por Organizador.
-- NULL = no fijó uno: rige el global del Admin (configuraciones_sistema.max_entradas_por_comprador).
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS max_entradas_por_comprador INTEGER;
