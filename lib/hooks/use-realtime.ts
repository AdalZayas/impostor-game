"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useRealtimeRoom(roomId: string) {
  const [trigger, setTrigger] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const setupChannel = async () => {
      channel = supabase
        .channel(`room:${roomId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => {
          setTrigger((prev) => prev + 1)
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
          () => {
            setTrigger((prev) => prev + 1)
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
          () => {
            setTrigger((prev) => prev + 1)
          },
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "player_turns" }, () => {
          setTrigger((prev) => prev + 1)
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
          setTrigger((prev) => prev + 1)
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "impostor_guess" }, () => {
          setTrigger((prev) => prev + 1)
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "round_results" }, () => {
          setTrigger((prev) => prev + 1)
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "player_scores", filter: `room_id=eq.${roomId}` },
          () => {
            setTrigger((prev) => prev + 1)
          },
        )
        .subscribe()
    }

    setupChannel()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, supabase])

  return trigger
}
