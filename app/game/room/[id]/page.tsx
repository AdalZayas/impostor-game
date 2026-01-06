"use client";

import { createClient } from "@/lib/supabase/client";
import { useRealtimeRoom } from "@/lib/hooks/use-realtime";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type {
  GameRoom,
  RoomPlayer,
  Player,
  Round,
  PlayerTurn,
  Vote,
  PlayerScore,
} from "@/lib/types";
import { LobbyScreen } from "@/components/game/lobby-screen";
import { GameScreen } from "@/components/game/game-screen";
import { VotingScreen } from "@/components/game/voting-screen";
import { GuessScreen } from "@/components/game/guess-screen"; // Added GuessScreen
import { ResultsScreen } from "@/components/game/results-screen";
import { FinalResultsScreen } from "@/components/game/final-results-screen";
import { TopBar } from "@/components/game/top-bar";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const trigger = useRealtimeRoom(roomId);

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [players, setPlayers] = useState<(RoomPlayer & { players: Player })[]>(
    []
  );
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [turns, setTurns] = useState<PlayerTurn[]>([]); // Changed from descriptions to turns
  const [votes, setVotes] = useState<Vote[]>([]);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [roomClosedMessage, setRoomClosedMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadRoomData() {
      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          router.push("/");
          return;
        }

        // Load current user
        const { data: player } = await supabase
          .from("players")
          .select("*")
          .eq("session_id", sessionId)
          .single();

        if (!player) {
          router.push("/");
          return;
        }
        setCurrentUser(player);

        // Load room
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (roomError || !roomData) {
          // Room not found - likely deleted by host
          setRoomClosedMessage("La sala fue cerrada por el anfitrión.");
          setTimeout(() => {
            router.push("/game");
          }, 3000);
          return;
        }
        setRoom(roomData);

        // Load players
        const { data: playersData } = await supabase
          .from("room_players")
          .select("*, players(*)")
          .eq("room_id", roomId)
          .order("joined_at", { ascending: true });

        if (playersData) {
          setPlayers(playersData as (RoomPlayer & { players: Player })[]);
        }

        // Load current round if game is playing
        if (roomData.status === "playing") {
          const { data: roundData } = await supabase
            .from("rounds")
            .select("*")
            .eq("room_id", roomId)
            .eq("round_number", roomData.current_round)
            .single();

          if (roundData) {
            setCurrentRound(roundData);

            const { data: turnsData } = await supabase
              .from("player_turns")
              .select("*")
              .eq("round_id", roundData.id);

            if (turnsData) {
              setTurns(turnsData);
            }

            // Load votes if in voting phase
            if (
              roundData.status === "voting" ||
              roundData.status === "completed" ||
              roundData.status === "guessing"
            ) {
              const { data: votesData } = await supabase
                .from("votes")
                .select("*")
                .eq("round_id", roundData.id);

              if (votesData) {
                setVotes(votesData);
              }
            }
          }
        }

        // Load scores
        const { data: scoresData } = await supabase
          .from("player_scores")
          .select("*")
          .eq("room_id", roomId)
          .order("total_score", { ascending: false });

        if (scoresData) {
          setScores(scoresData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading room data:", error);
        setLoading(false);
      }
    }

    loadRoomData();
  }, [roomId, router, supabase, trigger]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-lg">Cargando sala...</p>
      </div>
    );
  }

  if (roomClosedMessage) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-destructive">
            {roomClosedMessage}
          </p>
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-lg text-destructive">Sala no encontrada</p>
      </div>
    );
  }

  const isHost = room.host_player_id === currentUser.id;

  // Show appropriate screen based on game state
  if (room.status === "waiting") {
    return (
      <>
        <TopBar
          roomId={room.id}
          roomCode={room.code}
          isHost={isHost}
          isInGame={false}
        />
        <div className="pt-16">
          <LobbyScreen
            room={room}
            players={players}
            currentUser={currentUser}
            isHost={isHost}
          />
        </div>
      </>
    );
  }

  if (room.status === "playing" && currentRound) {
    if (currentRound.status === "active") {
      return (
        <>
          <TopBar
            roomId={room.id}
            roomCode={room.code}
            isHost={isHost}
            isInGame={true}
          />
          <div className="pt-16">
            <GameScreen
              room={room}
              round={currentRound}
              players={players}
              currentUser={currentUser}
              turns={turns}
              isHost={isHost}
            />
          </div>
        </>
      );
    }

    if (currentRound.status === "voting") {
      return (
        <>
          <TopBar
            roomId={room.id}
            roomCode={room.code}
            isHost={isHost}
            isInGame={true}
          />
          <div className="pt-16">
            <VotingScreen
              room={room}
              round={currentRound}
              players={players}
              currentUser={currentUser}
              votes={votes}
              isHost={isHost}
            />
          </div>
        </>
      );
    }

    if (currentRound.status === "guessing") {
      return (
        <>
          <TopBar
            roomId={room.id}
            roomCode={room.code}
            isHost={isHost}
            isInGame={true}
          />
          <div className="pt-16">
            <GuessScreen
              room={room}
              round={currentRound}
              players={players}
              currentUser={currentUser}
              isHost={isHost}
            />
          </div>
        </>
      );
    }

    if (currentRound.status === "completed") {
      return (
        <>
          <TopBar
            roomId={room.id}
            roomCode={room.code}
            isHost={isHost}
            isInGame={true}
          />
          <div className="pt-16">
            <ResultsScreen
              room={room}
              round={currentRound}
              players={players}
              currentUser={currentUser}
              scores={scores}
              isHost={isHost}
            />
          </div>
        </>
      );
    }
  }

  if (room.status === "finished") {
    return (
      <>
        <TopBar
          roomId={room.id}
          roomCode={room.code}
          isHost={isHost}
          isInGame={false}
        />
        <div className="pt-16">
          <FinalResultsScreen
            room={room}
            players={players}
            scores={scores}
            currentUser={currentUser}
          />
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-lg">Estado de juego desconocido</p>
    </div>
  );
}
