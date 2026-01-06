"use client"

import type { GameRoom, Round, RoomPlayer, Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { submitImpostorGuess } from "@/lib/game-actions"
import { useState } from "react"
import { Lightbulb, Eye, Users } from "lucide-react"

interface GuessScreenProps {
  room: GameRoom
  round: Round
  players: (RoomPlayer & { players: Player })[]
  currentUser: Player
  isHost: boolean
}

export function GuessScreen({ round, players, currentUser }: GuessScreenProps) {
  const [guess, setGuess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImpostor = round.impostor_player_id === currentUser.id
  const impostorPlayer = players.find((p) => p.player_id === round.impostor_player_id)

  const handleSubmitGuess = async () => {
    if (!guess.trim()) return
    setIsSubmitting(true)
    setError(null)

    try {
      await submitImpostorGuess(round.id, guess)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error al enviar adivinanza")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Lightbulb className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Fase de Adivinanza</h1>
          <p className="text-muted-foreground">El impostor tiene una oportunidad de adivinar la palabra común</p>
        </div>

        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Eye className="h-5 w-5" />
              El impostor es:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 font-bold text-destructive text-2xl">
                {impostorPlayer?.players?.display_name.charAt(0).toUpperCase()}
              </div>
              <p className="text-3xl font-bold">{impostorPlayer?.players?.display_name}</p>
            </div>
          </CardContent>
        </Card>

        {isImpostor ? (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Adivina la Palabra</CardTitle>
              <CardDescription>
                Si adivinas correctamente la palabra común, ganas el juego. Si fallas, el grupo gana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Escribe la palabra común..."
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                disabled={isSubmitting}
                className="text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guess.trim()) {
                    handleSubmitGuess()
                  }
                }}
              />
              <Button onClick={handleSubmitGuess} disabled={isSubmitting || !guess.trim()} className="w-full" size="lg">
                {isSubmitting ? "Enviando..." : "Enviar Adivinanza"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Esperando...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                El impostor está pensando en la palabra común. Espera los resultados...
              </p>
              <div className="flex justify-center mt-4">
                <Badge variant="secondary" className="text-lg px-6 py-2">
                  Adivinando...
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
