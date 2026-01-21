export interface Player {
  id: string;
  display_name: string;
  session_id: string;
  games_played: number;
  games_won: number;
  created_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_player_id: string;
  status: "waiting" | "playing" | "finished";
  max_players: number;
  round_duration: number;
  total_rounds: number;
  current_round: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

// Alias for backwards compatibility
export type GameRoom = Room;

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
  is_eliminated: boolean; // Added to track eliminated players
  players?: Player;
}

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  secret_word: string;
  impostor_player_id: string;
  started_at: string;
  ends_at: string;
  status: "active" | "voting" | "completed" | "guessing"; // Added "guessing" status for impostor guess phase
  turn_order: string[];
  current_turn_index: number;
  current_sub_round: number;
}

export interface PlayerDescription {
  id: string;
  round_id: string;
  player_id: string;
  description: string;
  submitted_at: string;
}

export interface Vote {
  id: string;
  round_id: string;
  voter_id: string;
  voted_for_id: string;
  created_at: string;
}

export interface RoundResult {
  id: string;
  round_id: string;
  impostor_caught: boolean;
  most_voted_player_id: string | null;
  points_awarded: Record<string, number>;
  created_at: string;
}

export interface PlayerScore {
  id: string;
  room_id: string;
  player_id: string;
  total_score: number;
  rounds_as_impostor: number;
  successful_impostor_rounds: number;
}

export interface WordPair {
  id: string;
  secret_word: string;
  language: string;
  is_active: boolean;
  created_at: string;
}

export interface PlayerTurn {
  id: string;
  round_id: string;
  player_id: string;
  turn_number: number;
  sub_round: number;
  completed_at: string;
}

export interface ImpostorGuess {
  id: string;
  round_id: string;
  impostor_id: string;
  guessed_word: string;
  is_correct: boolean;
  created_at: string;
}
