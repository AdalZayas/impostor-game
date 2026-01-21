-- Script para agregar más palabras secretas al juego
-- Ejecutar este script en tu base de datos Supabase
-- Solo la palabra secreta que conocen todos los jugadores excepto el impostor

INSERT INTO word_pairs (secret_word, language, is_active) VALUES
-- Animales
('Perro', 'es', true),
('Gato', 'es', true),
('Caballo', 'es', true),
('Pez', 'es', true),
('Águila', 'es', true),
('Serpiente', 'es', true),

-- Frutas
('Manzana', 'es', true),
('Naranja', 'es', true),
('Plátano', 'es', true),
('Uva', 'es', true),
('Sandía', 'es', true),
('Kiwi', 'es', true),

-- Deportes
('Fútbol', 'es', true),
('Básquetbol', 'es', true),
('Tenis', 'es', true),
('Natación', 'es', true),
('Boxeo', 'es', true),
('Esquí', 'es', true),

-- Profesiones
('Doctor', 'es', true),
('Maestro', 'es', true),
('Policía', 'es', true),
('Chef', 'es', true),
('Piloto', 'es', true),
('Arquitecto', 'es', true),

-- Transporte
('Carro', 'es', true),
('Avión', 'es', true),
('Barco', 'es', true),
('Tren', 'es', true),
('Bicicleta', 'es', true),
('Taxi', 'es', true),

-- Comida
('Pizza', 'es', true),
('Pasta', 'es', true),
('Sopa', 'es', true),
('Taco', 'es', true),
('Sushi', 'es', true),
('Paella', 'es', true),

-- Lugares
('Casa', 'es', true),
('Playa', 'es', true),
('Parque', 'es', true),
('Hotel', 'es', true),
('Hospital', 'es', true),
('Biblioteca', 'es', true),

-- Instrumentos
('Guitarra', 'es', true),
('Piano', 'es', true),
('Violín', 'es', true),
('Tambor', 'es', true),
('Flauta', 'es', true),
('Saxofón', 'es', true),

-- Colores
('Rojo', 'es', true),
('Azul', 'es', true),
('Verde', 'es', true),
('Amarillo', 'es', true),
('Violeta', 'es', true),
('Turquesa', 'es', true),

-- Tecnología
('Teléfono', 'es', true),
('Computadora', 'es', true),
('Televisión', 'es', true),
('Router', 'es', true),
('Smartwatch', 'es', true),
('Drone', 'es', true),

-- Objetos del hogar
('Silla', 'es', true),
('Mesa', 'es', true),
('Cama', 'es', true),
('Refrigerador', 'es', true),
('Lámpara', 'es', true),
('Espejo', 'es', true),

-- Emociones
('Alegría', 'es', true),
('Tristeza', 'es', true),
('Miedo', 'es', true),
('Amor', 'es', true),
('Enojo', 'es', true),
('Sorpresa', 'es', true),

-- Clima
('Lluvia', 'es', true),
('Sol', 'es', true),
('Nieve', 'es', true),
('Viento', 'es', true),
('Nube', 'es', true),
('Rayo', 'es', true);