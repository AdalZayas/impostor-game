"use client"

import type { GameRoom, RoomPlayer, Player, PlayerScore } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Award, Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface FinalResultsScreenProps {
  room: GameRoom
  players: (RoomPlayer & { players: Player })[]
  scores: PlayerScore[]
  currentUser: Player
}

export function FinalResultsScreen({ players, scores, currentUser }: FinalResultsScreenProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(10)

  const winner = scores[0]
  const winnerPlayer = players.find((p) => p.player_id === winner?.player_id)

  // Auto-return to lobby after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1
        if (next === 0) {
          router.push("/game")
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-4">
          <Trophy className="h-24 w-24 mx-auto text-primary" />
          <h1 className="text-5xl font-bold">¡Juego Terminado!</h1>
          {winnerPlayer && (
            <div className="space-y-2">
              <p className="text-2xl text-muted-foreground">El ganador es</p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-3xl">
                  {winnerPlayer.players.display_name.charAt(0).toUpperCase()}
                </div>
                <p className="text-4xl font-bold">{winnerPlayer.players.display_name}</p>
              </div>
              {winner.player_id === currentUser.id && (
                <p className="text-xl text-primary font-semibold">¡Felicitaciones! 🎉</p>
              )}
            </div>
          )}
          <p className="text-muted-foreground">Volviendo al lobby en {countdown} segundos...</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Clasificación Final
            </CardTitle>
            <CardDescription>Resultados del juego</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scores.map((score, index) => {
                const player = players.find((p) => p.player_id === score.player_id)
                if (!player) return null

                return (
                  <div
                    key={score.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      index === 0 ? "border-primary bg-primary/10" : index === 1 ? "bg-secondary/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-2xl ${
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : index === 1
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xl">
                        {player.players.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {player.players.display_name}
                          {player.player_id === currentUser.id && " (Tú)"}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>
                            <Target className="inline h-3 w-3 mr-1" />
                            {score.successful_impostor_rounds}/{score.rounds_as_impostor} imposturas exitosas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{score.total_score}</p>
                      <p className="text-sm text-muted-foreground">puntos</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => router.push("/game")} className="flex-1" size="lg">
            Volver al Lobby Ahora
          </Button>
        </div>
      </div>
    </div>
  )
}
