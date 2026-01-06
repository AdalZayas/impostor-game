"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { Player } from "@/lib/types"

export default function GamePage() {
  const [user, setUser] = useState<Player | null>(null)
  const [roomCode, setRoomCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const playerName = localStorage.getItem("playerName")
      if (!playerName) {
        router.push("/")
        return
      }

      const sessionId = getOrCreateSessionId()

      let { data: player } = await supabase.from("players").select("*").eq("session_id", sessionId).single()

      if (!player) {
        // Create new player
        const { data: newPlayer, error } = await supabase
          .from("players")
          .insert({
            display_name: playerName,
            session_id: sessionId,
            games_played: 0,
            games_won: 0,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating player:", error)
          setError("Error al crear jugador")
          setIsLoading(false)
          return
        }
        player = newPlayer
      }

      setUser(player)
      setIsLoading(false)
    }
    loadUser()
  }, [router, supabase])

  function getOrCreateSessionId() {
    let sessionId = localStorage.getItem("sessionId")
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("sessionId", sessionId)
    }
    document.cookie = `sessionId=${sessionId}; path=/; max-age=31536000; SameSite=Lax`
    return sessionId
  }

  const handleCreateRoom = async () => {
    if (!user) return
    setIsCreating(true)
    setError(null)

    try {
      // Generate room code
      const code = generateRoomCode()

      // Create room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          code: code,
          host_player_id: user.id,
          status: "waiting",
          max_players: 8,
          round_duration: 120,
          total_rounds: 3,
          selected_categories: [
            "Animales",
            "Frutas",
            "Deportes",
            "Profesiones",
            "Transporte",
            "Comida",
            "Lugares",
            "Instrumentos",
            "Colores",
            "Tecnología",
          ],
          selected_difficulty: ["easy", "medium", "hard"],
        })
        .select()
        .single()

      if (roomError) throw roomError

      // Join room as host
      const { error: joinError } = await supabase.from("room_players").insert({
        room_id: room.id,
        player_id: user.id,
        is_host: true,
        is_ready: true,
      })

      if (joinError) throw joinError

      router.push(`/game/room/${room.id}`)
    } catch (error: unknown) {
      console.error("[v0] Error creating room:", error)
      setError(error instanceof Error ? error.message : "Error al crear la sala")
    } finally {
      setIsCreating(false)
    }
  }

  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excluded similar chars
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !roomCode.trim()) return
    setIsJoining(true)
    setError(null)

    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode.toUpperCase())
        .eq("status", "waiting")
        .single()

      if (roomError || !room) throw new Error("Sala no encontrada")

      // Count players in room
      const { count } = await supabase
        .from("room_players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id)

      const playerCount = count || 0
      if (playerCount >= room.max_players) {
        throw new Error("La sala está llena")
      }

      // Check if already in room
      const { data: existingPlayer } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id)
        .eq("player_id", user.id)
        .single()

      if (!existingPlayer) {
        // Join room
        const { error: joinError } = await supabase.from("room_players").insert({
          room_id: room.id,
          player_id: user.id,
          is_host: false,
          is_ready: false,
        })

        if (joinError) throw joinError

        // Create player score entry
        await supabase.from("player_scores").insert({
          room_id: room.id,
          player_id: user.id,
          total_score: 0,
        })
      }

      router.push(`/game/room/${room.id}`)
    } catch (error: unknown) {
      console.error("[v0] Error joining room:", error)
      setError(error instanceof Error ? error.message : "Error al unirse a la sala")
    } finally {
      setIsJoining(false)
    }
  }

  const handleChangeName = () => {
    localStorage.removeItem("playerName")
    localStorage.removeItem("sessionId")
    document.cookie = "sessionId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Palabra Impostora</h1>
            <p className="text-muted-foreground">Bienvenido, {user.display_name}</p>
          </div>
          <Button variant="outline" onClick={handleChangeName}>
            Cambiar Nombre
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear Sala</CardTitle>
              <CardDescription>Crea una nueva sala de juego y comparte el código con tus amigos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreateRoom} className="w-full" disabled={isCreating}>
                {isCreating ? "Creando..." : "Crear Nueva Sala"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unirse a Sala</CardTitle>
              <CardDescription>Ingresa el código de una sala existente</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="roomCode">Código de sala</Label>
                  <Input
                    id="roomCode"
                    type="text"
                    placeholder="ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isJoining || !roomCode.trim()}>
                  {isJoining ? "Uniéndose..." : "Unirse a Sala"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Juegos jugados</p>
              <p className="text-2xl font-bold">{user.games_played}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Juegos ganados</p>
              <p className="text-2xl font-bold">{user.games_won}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
