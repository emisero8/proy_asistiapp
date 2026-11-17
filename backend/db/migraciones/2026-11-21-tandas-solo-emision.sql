-- 8.10 Tanda de cortesía: solo el Organizador emite entradas de ella (no se vende ni se muestra al público).
ALTER TABLE tandas ADD COLUMN IF NOT EXISTS solo_emision BOOLEAN NOT NULL DEFAULT FALSE;
