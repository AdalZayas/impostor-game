"use client";

// Players say their clue words verbally in Discord, app only tracks turns

import type {
  GameRoom,
  Round,
  RoomPlayer,
  Player,
  PlayerTurn,
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
import { Progress } from "@/components/ui/progress";
import { completeTurn } from "@/lib/game-actions";
import { useState, useEffect, useCallback } from "react";
import { Clock, Users, Eye, Mic, Keyboard } from "lucide-react";

interface GameScreenProps {
  room: GameRoom;
  round: Round;
  players: (RoomPlayer & { players: Player })[];
  currentUser: Player;
  turns: PlayerTurn[];
  isHost: boolean;
}

export function GameScreen({
  room,
  round,
  players,
  currentUser,
  turns,
}: GameScreenProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [playerWord, setPlayerWord] = useState<string | null>(null);
  const [isImpostor, setIsImpostor] = useState(false);
  const [category, setCategory] = useState("");

  const currentTurnPlayerId = round.turn_order[round.current_turn_index];
  const currentTurnPlayer = players.find(
    (p) => p.player_id === currentTurnPlayerId
  );
  const isMyTurn = currentTurnPlayerId === currentUser.id;

  useEffect(() => {
    async function loadWord() {
      try {
        const response = await fetch(`/api/rounds/${round.id}/word`);
        const wordData = await response.json();
        // CRITICAL: API returns null for impostor, never the secret word
        setPlayerWord(wordData.word);
        setIsImpostor(wordData.isImpostor);
        setCategory(wordData.category);
      } catch (error) {
        console.error("Error loading word:", error);
      }
    }
    loadWord();
  }, [round.id]);

  const timeProgress = (timeLeft / room.round_duration) * 100;

  const handleCompleteTurn = useCallback(async () => {
    if (!isMyTurn || isCompleting) return;
    setIsCompleting(true);
    setError(null);

    try {
      await completeTurn(round.id);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Error al completar turno"
      );
    } finally {
      setIsCompleting(false);
    }
  }, [isMyTurn, isCompleting, round.id]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endsAt = new Date(round.ends_at);
      const diff = Math.max(
        0,
        Math.floor((endsAt.getTime() - now.getTime()) / 1000)
      );
      setTimeLeft(diff);

      if (diff === 0 && isMyTurn) {
        handleCompleteTurn();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [round.ends_at, isMyTurn, handleCompleteTurn]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && isMyTurn && !isCompleting) {
        e.preventDefault();
        handleCompleteTurn();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isMyTurn, isCompleting, handleCompleteTurn]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            Ronda {round.current_sub_round} de {room.total_rounds}
          </h1>
          <p className="text-muted-foreground">Categoría: {category}</p>
          <Badge
            variant={timeLeft > 10 ? "default" : "destructive"}
            className="text-lg px-4 py-2"
          >
            <Clock className="mr-2 h-4 w-4" />
            {formatTime(timeLeft)}
          </Badge>
        </div>

        <Progress value={timeProgress} className="h-2" />

        <Card
          className={
            isImpostor
              ? "border-destructive bg-destructive/10"
              : "border-primary bg-primary/10"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Eye className="h-5 w-5" />
              {isImpostor ? "¡Eres el Impostor!" : "Tu Palabra"}
            </CardTitle>
            <CardDescription className="text-center">
              {isImpostor
                ? "NO conoces la palabra secreta. Escucha las pistas en Discord e intenta mezclarte con los demás."
                : "Di palabras relacionadas verbalmente en Discord."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isImpostor ? (
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-destructive mb-4">
                  Eres el impostor
                </p>
                <p className="text-muted-foreground">
                  Escucha atentamente en Discord y deduce la palabra común. Di
                  algo relacionado sin revelar que no sabes la palabra exacta.
                </p>
              </div>
            ) : (
              <p className="text-5xl font-bold text-center py-6">
                {playerWord}
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className={`border-2 ${
            isMyTurn
              ? "border-primary bg-primary/5 shadow-2xl animate-pulse"
              : "border-muted bg-muted/20"
          }`}
        >
          <CardContent className="pt-8 pb-8">
            {isMyTurn ? (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-primary">
                    ES TU TURNO
                  </h2>
                  <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
                    <Mic className="h-5 w-5" />
                    Di tu palabra en Discord
                  </p>
                </div>

                <Button
                  onClick={handleCompleteTurn}
                  disabled={isCompleting}
                  size="lg"
                  className="text-2xl px-12 py-8 h-auto"
                >
                  {isCompleting ? "Completando..." : "Ya dije la palabra"}
                </Button>

                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Keyboard className="h-4 w-4" />O presiona BARRA ESPACIADORA
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-muted-foreground">
                  Turno de:
                </h2>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-3xl">
                    {currentTurnPlayer?.players?.display_name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <p className="text-4xl font-bold">
                    {currentTurnPlayer?.players?.display_name}
                  </p>
                </div>
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <Mic className="h-5 w-5" />
                  Esperando que diga su palabra...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Orden de Turnos
            </CardTitle>
            <CardDescription>
              Los jugadores hablan en este orden (se repite {room.total_rounds}{" "}
              veces)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-center">
              {round.turn_order.map((playerId, index) => {
                const player = players.find((p) => p.player_id === playerId);
                const isCurrent = index === round.current_turn_index;
                const hasTurned = turns.some(
                  (t) =>
                    t.player_id === playerId &&
                    t.sub_round === round.current_sub_round
                );

                return (
                  <div
                    key={playerId}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${
                      isCurrent
                        ? "border-primary bg-primary/10 scale-110"
                        : hasTurned
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                      {player?.players?.display_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium">
                      {player?.players?.display_name}
                    </p>
                    {isCurrent && <Badge variant="default">Actual</Badge>}
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
      </div>
    </div>
  );
}
