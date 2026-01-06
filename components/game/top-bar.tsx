"use client";

import { Button } from "@/components/ui/button";
import { leaveRoom, endGame } from "@/lib/game-actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, XCircle } from "lucide-react";

interface TopBarProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  isInGame: boolean; // true if status is "playing", false if "waiting"
}

export function TopBar({ roomId, roomCode, isHost, isInGame }: TopBarProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();

  const handleLeave = async () => {
    const confirmMessage = isHost
      ? "Como anfitrión, si abandonas la sala, esta será cerrada para todos los jugadores. ¿Continuar?"
      : "¿Estás seguro de que quieres abandonar esta sala?";

    if (!confirm(confirmMessage)) return;

    setIsLeaving(true);
    try {
      await leaveRoom(roomId);
      router.push("/game");
    } catch (error) {
      console.error("Error leaving room:", error);
      setIsLeaving(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm("¿Terminar el juego y volver a la sala de espera?")) return;

    setIsEnding(true);
    try {
      await endGame(roomId);
    } catch (error) {
      console.error("Error ending game:", error);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Sala: {roomCode}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Host-only: End Game button (only visible during game) */}
          {isHost && isInGame && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isEnding}
              onClick={handleEndGame}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Terminar juego
            </Button>
          )}

          {/* All players: Leave room button */}
          <Button
            variant="outline"
            size="sm"
            disabled={isLeaving}
            onClick={handleLeave}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abandonar sala
          </Button>
        </div>
      </div>
    </div>
  );
}
