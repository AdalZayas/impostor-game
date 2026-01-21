"use client";

import type { GameRoom, RoomPlayer, Player } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  startGame,
  toggleReady,
  leaveRoom,
  updateRoomSettings,
  kickPlayer,
} from "@/lib/game-actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Users, Clock, Trophy, Settings, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LobbyScreenProps {
  room: GameRoom;
  players: (RoomPlayer & { players: Player })[];
  currentUser: Player;
  isHost: boolean;
}

export function LobbyScreen({
  room,
  players,
  currentUser,
  isHost,
}: LobbyScreenProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  const [maxPlayers, setMaxPlayers] = useState(room.max_players);
  const [roundDuration, setRoundDuration] = useState(room.round_duration);
  const [totalRounds, setTotalRounds] = useState(room.total_rounds);
  const [isSaving, setIsSaving] = useState(false);

  const currentPlayer = players.find((p) => p.player_id === currentUser.id);
  const allReady = players.every((p) => p.is_ready);
  const canStart = players.length >= 3 && allReady;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await startGame(room.id);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Error al iniciar el juego"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleReady = async () => {
    setIsToggling(true);
    setError(null);
    try {
      await toggleReady(room.id);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Error al cambiar estado"
      );
    } finally {
      setIsToggling(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveRoom(room.id);
      router.push("/game");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error al salir");
      setIsLeaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateRoomSettings(room.id, {
        maxPlayers,
        roundDuration,
        totalRounds,
      });
      setShowSettings(false);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al guardar configuración"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    try {
      await kickPlayer(room.id, playerId);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Error al expulsar jugador"
      );
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Sala de Espera</h1>
          <div className="flex items-center justify-center gap-2">
            <code className="text-3xl font-mono font-bold tracking-wider">
              {room.code}
            </code>
            <Button variant="ghost" size="icon" onClick={handleCopyCode}>
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground">
            Comparte este código con tus amigos
          </p>
        </div>

        {isHost && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {showSettings ? "Ocultar Configuración" : "Configurar Juego"}
            </Button>
          </div>
        )}

        {isHost && showSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Juego</CardTitle>
              <CardDescription>
                Personaliza las reglas antes de empezar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPlayers">
                      Máximo de Jugadores: {maxPlayers}
                    </Label>
                    <Input
                      id="maxPlayers"
                      type="range"
                      min="3"
                      max="12"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalRounds">
                      Rondas antes de votación (vueltas completas):{" "}
                      {totalRounds}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cada ronda = todos los jugadores hablan una vez en orden
                    </p>
                    <Input
                      id="totalRounds"
                      type="range"
                      min="1"
                      max="10"
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roundDuration">
                      Tiempo por turno: {roundDuration}s
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cada jugador tiene este tiempo para hablar
                    </p>
                    <Input
                      id="roundDuration"
                      type="range"
                      min="30"
                      max="300"
                      step="15"
                      value={roundDuration}
                      onChange={(e) => setRoundDuration(Number(e.target.value))}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Jugadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {players.length} / {room.max_players}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" />
                Rondas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{room.total_rounds}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Tiempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{room.round_duration}s</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jugadores en la Sala</CardTitle>
            <CardDescription>
              {players.length < 3
                ? `Se necesitan al menos 3 jugadores (${
                    3 - players.length
                  } más)`
                : allReady
                ? "¡Todos listos! El anfitrión puede iniciar el juego"
                : "Esperando a que todos estén listos..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {player.players.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {player.players.display_name}
                        {player.player_id === currentUser.id && " (Tú)"}
                        {player.player_id === room.host_player_id && " 👑"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_ready ? (
                      <Badge variant="default">Listo</Badge>
                    ) : (
                      <Badge variant="secondary">Esperando</Badge>
                    )}
                    {isHost && player.player_id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleKickPlayer(player.player_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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

        <div className="flex gap-4">
          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className="flex-1"
              size="lg"
            >
              {isStarting ? "Iniciando..." : "Iniciar Juego"}
            </Button>
          ) : (
            <Button
              onClick={handleToggleReady}
              disabled={isToggling}
              variant={currentPlayer?.is_ready ? "secondary" : "default"}
              className="flex-1"
              size="lg"
            >
              {isToggling
                ? "Cambiando..."
                : currentPlayer?.is_ready
                ? "Cancelar"
                : "¡Listo!"}
            </Button>
          )}

          <Button
            onClick={handleLeave}
            disabled={isLeaving}
            variant="outline"
            size="lg"
          >
            {isLeaving ? "Saliendo..." : "Salir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
