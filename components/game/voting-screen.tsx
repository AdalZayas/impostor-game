"use client"

import type { GameRoom, Round, RoomPlayer, Player, Vote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { submitVote } from "@/lib/game-actions"
import { useState } from "react"
import { VoteIcon, Users, AlertCircle } from "lucide-react"

interface VotingScreenProps {
  room: GameRoom
  round: Round
  players: (RoomPlayer & { players: Player })[]
  currentUser: Player
  votes: Vote[]
  isHost: boolean
}

export function VotingScreen({ players, currentUser, votes, round }: VotingScreenProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlayers = players.filter((p) => !p.is_eliminated)
  const currentVote = votes.find((v) => v.voter_id === currentUser.id)
  const hasVoted = !!currentVote
  const allVoted = votes.length === activePlayers.length

  const handleVote = async (playerId: string) => {
    setIsVoting(true)
    setError(null)

    try {
      await submitVote(round.id, playerId)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error al votar")
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Fase de Votación</h1>
          <p className="text-muted-foreground">¿Quién crees que es el impostor?</p>
        </div>

        {allVoted && (
          <Card className="border-secondary bg-secondary/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-secondary" />
                <p className="text-secondary font-medium">
                  ¡Todos han votado! Los resultados se mostrarán automáticamente...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {activePlayers.map((player) => {
            const isSelected = currentVote?.voted_for_id === player.player_id
            const isCurrentUser = player.player_id === currentUser.id

            return (
              <Card key={player.id} className={isSelected ? "border-primary bg-primary/10" : ""}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-3xl">
                      {player.players.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {player.players.display_name}
                        {isCurrentUser && " (Tú)"}
                      </p>
                      {isSelected && (
                        <Badge variant="default" className="mt-2">
                          Tu voto
                        </Badge>
                      )}
                    </div>

                    {!isCurrentUser && !hasVoted && (
                      <Button
                        onClick={() => handleVote(player.player_id)}
                        disabled={isVoting}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full"
                        size="lg"
                      >
                        <VoteIcon className="mr-2 h-4 w-4" />
                        {isVoting ? "Votando..." : "Votar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Estado de Votación
            </CardTitle>
            <CardDescription>
              {allVoted ? "¡Todos han votado!" : `${votes.length} de ${activePlayers.length} jugadores han votado`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {activePlayers.map((player) => {
                const hasVoted = votes.some((v) => v.voter_id === player.player_id)
                return (
                  <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                        {player.players.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium">{player.players.display_name}</p>
                    </div>
                    {hasVoted ? <Badge variant="default">Votó</Badge> : <Badge variant="secondary">Pensando...</Badge>}
                  </div>
                )
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
  )
}
