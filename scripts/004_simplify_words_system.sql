-- Migración para simplificar el sistema de palabras
-- Solo la palabra secreta, sin palabra del impostor

-- 1. Agregar nueva columna secret_word
ALTER TABLE word_pairs ADD COLUMN secret_word TEXT;

-- 2. Migrar datos existentes (copiar common_word a secret_word)
UPDATE word_pairs SET secret_word = common_word WHERE secret_word IS NULL;

-- 3. Hacer secret_word NOT NULL
ALTER TABLE word_pairs ALTER COLUMN secret_word SET NOT NULL;

-- 4. Eliminar columnas innecesarias
ALTER TABLE word_pairs DROP COLUMN IF EXISTS common_word;
ALTER TABLE word_pairs DROP COLUMN IF EXISTS impostor_word;
ALTER TABLE word_pairs DROP COLUMN IF EXISTS category;
ALTER TABLE word_pairs DROP COLUMN IF EXISTS difficulty;

-- 5. Actualizar tabla rounds para usar secret_word
ALTER TABLE rounds ADD COLUMN secret_word TEXT;

-- 6. Migrar datos existentes en rounds
UPDATE rounds SET secret_word = common_word WHERE secret_word IS NULL;

-- 7. Hacer secret_word NOT NULL en rounds
ALTER TABLE rounds ALTER COLUMN secret_word SET NOT NULL;

-- 8. Eliminar columnas innecesarias de rounds
ALTER TABLE rounds DROP COLUMN IF EXISTS common_word;
ALTER TABLE rounds DROP COLUMN IF EXISTS impostor_word;
ALTER TABLE rounds DROP COLUMN IF EXISTS category;

-- 9. Eliminar columnas innecesarias de rooms
ALTER TABLE rooms DROP COLUMN IF EXISTS selected_categories;
ALTER TABLE rooms DROP COLUMN IF EXISTS selected_difficulty;

-- 10. Limpiar word_pairs duplicadas y agregar algunas palabras de ejemplo
DELETE FROM word_pairs;

INSERT INTO word_pairs (secret_word, language, is_active) VALUES
-- Palabras básicas para empezar
('Perro', 'es', true),
('Gato', 'es', true),
('Pizza', 'es', true),
('Casa', 'es', true),
('Carro', 'es', true),
('Guitarra', 'es', true),
('Hospital', 'es', true),
('Playa', 'es', true),
('Silla', 'es', true),
('Teléfono', 'es', true);