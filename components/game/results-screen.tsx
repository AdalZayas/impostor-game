"use client";

import type {
  GameRoom,
  Round,
  RoomPlayer,
  Player,
  PlayerScore,
  ImpostorGuess,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startNextRound } from "@/lib/game-actions";
import { useState, useEffect, useCallback } from "react";
import { Trophy, Target, AlertCircle, Lightbulb, XCircle } from "lucide-react";
import type { RoundResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface ResultsScreenProps {
  room: GameRoom;
  players: (RoomPlayer & { players: Player })[];
  currentUser: Player;
  scores: PlayerScore[];
  isHost: boolean;
  round: Round;
}

export function ResultsScreen({
  room,
  round,
  players,
  currentUser,
  scores,
  isHost,
}: ResultsScreenProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [impostorGuess, setImpostorGuess] = useState<ImpostorGuess | null>(
    null
  );
  const [countdown, setCountdown] = useState(5);
  const supabase = createClient();

  // Check if this is the 2-player endgame scenario
  const activePlayers = players.filter((p) => !p.is_eliminated);
  const is2PlayerEndgame = activePlayers.length === 2;

  useEffect(() => {
    async function loadResult() {
      const { data } = await supabase
        .from("round_results")
        .select("*")
        .eq("round_id", round.id)
        .single();

      if (data) {
        setResult(data);
      }

      // Load impostor guess if it exists
      const { data: guessData } = await supabase
        .from("impostor_guess")
        .select("*")
        .eq("round_id", round.id)
        .single();

      if (guessData) {
        setImpostorGuess(guessData);
      }
    }
    loadResult();
  }, [round.id, supabase]);

  const handleNextRound = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      await startNextRound(room.id);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al iniciar siguiente ronda"
      );
    } finally {
      setIsStarting(false);
    }
  }, [room.id]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next === 0 && isHost) {
          const isLastRound = room.current_round >= room.total_rounds;
          if (!isLastRound) {
            handleNextRound();
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    countdown,
    isHost,
    room.current_round,
    room.total_rounds,
    handleNextRound,
  ]);

  const impostorPlayer = players.find(
    (p) => p.player_id === round.impostor_player_id
  );
  const eliminatedPlayer = players.find(
    (p) => p.player_id === result?.most_voted_player_id
  );
  const isLastRound = room.current_round >= room.total_rounds;

  // Check if this is the 2-player endgame final reveal
  if (is2PlayerEndgame) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center p-6 md:p-10">
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">¡Juego Terminado!</h1>
            <p className="text-muted-foreground">
              Solo quedan 2 jugadores - Revelación final
            </p>
          </div>

          {/* Final Reveal Card */}
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center text-2xl">
                <AlertCircle className="h-6 w-6" />
                Revelación Final
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  El impostor era:
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 font-bold text-destructive text-2xl">
                    {impostorPlayer?.players.display_name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <p className="text-2xl font-bold">
                    {impostorPlayer?.players.display_name}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Palabra secreta:
                  </p>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {round.secret_word}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    El impostor NO conocía esta palabra
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-lg font-semibold">
                  {impostorPlayer &&
                  activePlayers.some(
                    (p) => p.player_id === impostorPlayer.player_id
                  )
                    ? "¡El impostor sobrevivió!"
                    : "¡El impostor fue eliminado!"}
                </p>
              </div>

              <div className="pt-4">
                <h3 className="font-semibold mb-2">
                  Jugadores sobrevivientes:
                </h3>
                <div className="flex justify-center gap-4">
                  {activePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 rounded-lg border p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {player.players.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium">
                        {player.players.display_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Show eliminated players */}
          <Card>
            <CardHeader>
              <CardTitle>Jugadores Eliminados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {players
                  .filter((p) => p.is_eliminated)
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg border p-3 opacity-60"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
                        {player.players.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium">
                        {player.players.display_name}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Resultados de la Ronda</h1>
          <p className="text-muted-foreground">
            Ronda {room.current_round} de {room.total_rounds}
          </p>
          {!isLastRound && countdown > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Siguiente ronda en {countdown}s
            </Badge>
          )}
        </div>

        {impostorGuess ? (
          <>
            {/* Show impostor guess results */}
            <Card
              className={
                impostorGuess.is_correct
                  ? "border-destructive bg-destructive/5"
                  : "border-primary bg-primary/5"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-center justify-center text-2xl">
                  {impostorGuess.is_correct ? (
                    <>
                      <Lightbulb className="h-6 w-6" />
                      ¡El Impostor Adivinó la Palabra!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6" />
                      ¡El Impostor Falló!
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    El impostor era:
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 font-bold text-destructive text-2xl">
                      {impostorPlayer?.players.display_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <p className="text-2xl font-bold">
                      {impostorPlayer?.players.display_name}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Palabra secreta:
                    </p>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {round.secret_word}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      El impostor NO conocía esta palabra
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Adivinó:</p>
                  <Badge
                    variant={impostorGuess.is_correct ? "default" : "secondary"}
                    className="text-lg px-4 py-2"
                  >
                    {impostorGuess.guessed_word}
                  </Badge>
                </div>

                <div className="text-lg font-semibold pt-4">
                  {impostorGuess.is_correct
                    ? "¡El impostor gana!"
                    : "¡El grupo gana!"}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Show elimination results */}
            <Card
              className={
                result?.impostor_caught
                  ? "border-primary bg-primary/5"
                  : "border-destructive bg-destructive/5"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-center justify-center text-2xl">
                  {result?.impostor_caught ? (
                    <>
                      <Target className="h-6 w-6" />
                      ¡Impostor Capturado!
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-6 w-6" />
                      Jugador Eliminado
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Jugador eliminado:
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 font-bold text-destructive text-2xl">
                      {eliminatedPlayer?.players.display_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <p className="text-2xl font-bold">
                      {eliminatedPlayer?.players.display_name}
                    </p>
                  </div>
                </div>

                {!result?.impostor_caught && (
                  <div className="pt-4">
                    <p className="text-destructive font-semibold">
                      ¡Era un jugador inocente!
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      El impostor sigue entre ustedes...
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Palabra secreta:
                    </p>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {round.secret_word}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      El impostor NO conocía esta palabra
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Puntuación Acumulada
            </CardTitle>
            <CardDescription>
              Clasificación después de {room.current_round} rondas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scores.map((score, index) => {
                const player = players.find(
                  (p) => p.player_id === score.player_id
                );
                if (!player) return null;

                const pointsThisRound =
                  result?.points_awarded?.[score.player_id] || 0;

                return (
                  <div
                    key={score.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      index === 0 ? "border-primary bg-primary/5" : ""
                    } ${player.is_eliminated ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {player.players.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {player.players.display_name}
                          {player.player_id === currentUser.id && " (Tú)"}
                          {player.is_eliminated && " - Eliminado"}
                        </p>
                        {pointsThisRound > 0 && (
                          <p className="text-sm text-primary">
                            +{pointsThisRound} puntos esta ronda
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{score.total_score}</p>
                      <p className="text-sm text-muted-foreground">puntos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {isHost && !isLastRound && countdown > 0 && (
          <Button
            onClick={handleNextRound}
            disabled={isStarting}
            className="w-full"
            size="lg"
          >
            {isStarting
              ? "Iniciando..."
              : `Siguiente Ronda (Auto en ${countdown}s)`}
          </Button>
        )}

        {isLastRound && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-lg font-medium">
                ¡Juego terminado! Mostrando resultados finales...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
