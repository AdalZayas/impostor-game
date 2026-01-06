-- Add turn system for Discord voice companion mode

-- Add turn-related columns to rounds table
ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS turn_order TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS current_turn_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_sub_round INT DEFAULT 1;

-- Create player_turns table to track turn completions
CREATE TABLE IF NOT EXISTS player_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  sub_round INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id, sub_round)
);

-- Add eliminated players tracking
ALTER TABLE room_players
ADD COLUMN IF NOT EXISTS is_eliminated BOOLEAN DEFAULT false;

-- Create impostor_guess table for guess phase
CREATE TABLE IF NOT EXISTS impostor_guess (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  impostor_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  guessed_word TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE player_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostor_guess ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on player_turns" ON player_turns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on impostor_guess" ON impostor_guess FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE player_turns;
ALTER PUBLICATION supabase_realtime ADD TABLE impostor_guess;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_player_turns_round ON player_turns(round_id);
CREATE INDEX IF NOT EXISTS idx_impostor_guess_round ON impostor_guess(round_id);
