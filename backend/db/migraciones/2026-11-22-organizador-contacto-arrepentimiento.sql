-- 8.8: contacto del Organizador al que deriva el botón de arrepentimiento (WhatsApp y/o email).
-- Hibernate (ddl-auto: update) lo crea solo; este script es para bases donde se aplican los cambios a mano.
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS contacto_whatsapp VARCHAR(20);
ALTER TABLE organizadores ADD COLUMN IF NOT EXISTS contacto_email VARCHAR(200);
