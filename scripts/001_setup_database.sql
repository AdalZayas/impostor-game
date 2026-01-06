-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS player_descriptions CASCADE;
DROP TABLE IF EXISTS round_results CASCADE;
DROP TABLE IF EXISTS player_scores CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS word_pairs CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- Create players table (for tracking player names and sessions)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create word_pairs table
CREATE TABLE word_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  common_word TEXT NOT NULL,
  impostor_word TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  language TEXT NOT NULL DEFAULT 'es',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INT NOT NULL DEFAULT 8,
  round_duration INT NOT NULL DEFAULT 120,
  total_rounds INT NOT NULL DEFAULT 3,
  current_round INT NOT NULL DEFAULT 0,
  selected_categories TEXT[] NOT NULL DEFAULT ARRAY['Animales', 'Frutas', 'Deportes', 'Profesiones', 'Transporte', 'Comida', 'Lugares', 'Instrumentos', 'Colores', 'Tecnología'],
  selected_difficulty TEXT[] NOT NULL DEFAULT ARRAY['easy', 'medium', 'hard'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Create room_players table
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- Create rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  category TEXT NOT NULL,
  common_word TEXT NOT NULL,
  impostor_word TEXT NOT NULL,
  impostor_player_id UUID NOT NULL REFERENCES players(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voting', 'completed'))
);

-- Create player_descriptions table
CREATE TABLE player_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  voted_for_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, voter_id)
);

-- Create player_scores table
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  total_score INT NOT NULL DEFAULT 0,
  rounds_as_impostor INT NOT NULL DEFAULT 0,
  successful_impostor_rounds INT NOT NULL DEFAULT 0,
  UNIQUE(room_id, player_id)
);

-- Create round_results table
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  impostor_caught BOOLEAN NOT NULL,
  most_voted_player_id UUID REFERENCES players(id),
  points_awarded JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_player ON room_players(player_id);
CREATE INDEX idx_rounds_room ON rounds(room_id);
CREATE INDEX idx_player_descriptions_round ON player_descriptions(round_id);
CREATE INDEX idx_votes_round ON votes(round_id);
CREATE INDEX idx_player_scores_room ON player_scores(room_id);

-- Enable Row Level Security on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all operations since there's no authentication)
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on word_pairs" ON word_pairs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on room_players" ON room_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on player_descriptions" ON player_descriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on votes" ON votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on player_scores" ON player_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on round_results" ON round_results FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE word_pairs;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE player_descriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE player_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE round_results;

-- Insert 50 Spanish word pairs
INSERT INTO word_pairs (category, common_word, impostor_word, difficulty) VALUES
  -- Animales (10 pairs)
  ('Animales', 'perro', 'gato', 'easy'),
  ('Animales', 'león', 'tigre', 'easy'),
  ('Animales', 'elefante', 'rinoceronte', 'medium'),
  ('Animales', 'águila', 'halcón', 'medium'),
  ('Animales', 'delfín', 'tiburón', 'easy'),
  ('Animales', 'serpiente', 'lagarto', 'medium'),
  ('Animales', 'mono', 'gorila', 'easy'),
  ('Animales', 'mariposa', 'polilla', 'hard'),
  ('Animales', 'araña', 'escorpión', 'medium'),
  ('Animales', 'pingüino', 'foca', 'medium'),
  
  -- Frutas (5 pairs)
  ('Frutas', 'manzana', 'pera', 'easy'),
  ('Frutas', 'naranja', 'mandarina', 'easy'),
  ('Frutas', 'plátano', 'banana', 'hard'),
  ('Frutas', 'sandía', 'melón', 'easy'),
  ('Frutas', 'fresa', 'frambuesa', 'medium'),
  
  -- Deportes (5 pairs)
  ('Deportes', 'fútbol', 'baloncesto', 'easy'),
  ('Deportes', 'tenis', 'bádminton', 'medium'),
  ('Deportes', 'natación', 'buceo', 'medium'),
  ('Deportes', 'boxeo', 'karate', 'easy'),
  ('Deportes', 'esquí', 'snowboard', 'medium'),
  
  -- Profesiones (5 pairs)
  ('Profesiones', 'médico', 'enfermero', 'easy'),
  ('Profesiones', 'profesor', 'maestro', 'hard'),
  ('Profesiones', 'cocinero', 'chef', 'medium'),
  ('Profesiones', 'policía', 'bombero', 'easy'),
  ('Profesiones', 'abogado', 'juez', 'medium'),
  
  -- Transporte (5 pairs)
  ('Transporte', 'coche', 'camión', 'easy'),
  ('Transporte', 'avión', 'helicóptero', 'easy'),
  ('Transporte', 'bicicleta', 'motocicleta', 'easy'),
  ('Transporte', 'barco', 'yate', 'medium'),
  ('Transporte', 'tren', 'metro', 'medium'),
  
  -- Comida (5 pairs)
  ('Comida', 'pizza', 'hamburguesa', 'easy'),
  ('Comida', 'pasta', 'arroz', 'easy'),
  ('Comida', 'sushi', 'ramen', 'medium'),
  ('Comida', 'taco', 'burrito', 'medium'),
  ('Comida', 'helado', 'yogur', 'easy'),
  
  -- Lugares (5 pairs)
  ('Lugares', 'playa', 'piscina', 'easy'),
  ('Lugares', 'montaña', 'volcán', 'medium'),
  ('Lugares', 'biblioteca', 'museo', 'medium'),
  ('Lugares', 'cine', 'teatro', 'easy'),
  ('Lugares', 'parque', 'jardín', 'medium'),
  
  -- Instrumentos (5 pairs)
  ('Instrumentos', 'guitarra', 'bajo', 'easy'),
  ('Instrumentos', 'piano', 'teclado', 'medium'),
  ('Instrumentos', 'batería', 'tambor', 'medium'),
  ('Instrumentos', 'violín', 'viola', 'hard'),
  ('Instrumentos', 'flauta', 'clarinete', 'hard'),
  
  -- Colores (2 pairs)
  ('Colores', 'rojo', 'naranja', 'easy'),
  ('Colores', 'azul', 'turquesa', 'medium'),
  
  -- Tecnología (3 pairs)
  ('Tecnología', 'ordenador', 'portátil', 'easy'),
  ('Tecnología', 'teléfono', 'tablet', 'easy'),
  ('Tecnología', 'ratón', 'teclado', 'easy');
