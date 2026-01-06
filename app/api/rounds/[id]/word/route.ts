import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;
    const sessionId = (await cookies()).get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "No hay sesión activa" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get player
    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 404 }
      );
    }

    // Get round info
    const { data: round } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (!round) {
      return NextResponse.json(
        { error: "Ronda no encontrada" },
        { status: 404 }
      );
    }

    // Return appropriate word based on whether player is impostor
    // CRITICAL: Impostor must NEVER receive the secret word
    const isImpostor = round.impostor_player_id === player.id;

    return NextResponse.json({
      word: isImpostor ? null : round.common_word, // Impostor gets null, not the secret word
      isImpostor,
      category: round.category,
    });
  } catch (error) {
    console.error("Error getting player word:", error);
    return NextResponse.json(
      { error: "Error al obtener palabra" },
      { status: 500 }
    );
  }
}
