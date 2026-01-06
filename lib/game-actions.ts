"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function getCurrentPlayer() {
  const sessionId = (await cookies()).get("sessionId")?.value;
  if (!sessionId) throw new Error("No hay sesión activa");

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (!player) throw new Error("Jugador no encontrado");
  return player;
}

export async function startGame(roomId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Verify user is host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room || room.host_player_id !== playerId) {
    throw new Error("Solo el anfitrión puede iniciar el juego");
  }

  // Check minimum players
  const { count } = await supabase
    .from("room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (!count || count < 3) {
    throw new Error("Se necesitan al menos 3 jugadores para empezar");
  }

  // Check all players are ready
  const { data: unreadyPlayers } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_ready", false);

  if (unreadyPlayers && unreadyPlayers.length > 0) {
    throw new Error("Todos los jugadores deben estar listos");
  }

  // Initialize player scores for all players in the room
  const { data: roomPlayers } = await supabase
    .from("room_players")
    .select("player_id")
    .eq("room_id", roomId);

  if (roomPlayers) {
    for (const rp of roomPlayers) {
      await supabase.from("player_scores").upsert(
        {
          room_id: roomId,
          player_id: rp.player_id,
          total_score: 0,
        },
        {
          onConflict: "room_id,player_id",
        }
      );
    }
  }

  // Update room status
  await supabase
    .from("rooms")
    .update({
      status: "playing",
      started_at: new Date().toISOString(),
      current_round: 1,
    })
    .eq("id", roomId);

  // Start first round
  await startRound(roomId, 1);

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}

export async function startRound(roomId: string, roundNumber: number) {
  const supabase = await createClient();

  // Get room settings
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Sala no encontrada");

  const { data: wordPairs } = await supabase
    .from("word_pairs")
    .select("*")
    .eq("is_active", true)
    .in("category", room.selected_categories || [])
    .in("difficulty", room.selected_difficulty || []);

  if (!wordPairs || wordPairs.length === 0) {
    throw new Error(
      "No hay pares de palabras disponibles con la configuración seleccionada"
    );
  }

  const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

  const { data: roomPlayers } = await supabase
    .from("room_players")
    .select("player_id")
    .eq("room_id", roomId)
    .eq("is_eliminated", false);

  if (!roomPlayers || roomPlayers.length === 0) {
    throw new Error("No hay jugadores en la sala");
  }

  // Select random impostor
  const impostorIndex = Math.floor(Math.random() * roomPlayers.length);
  const impostorId = roomPlayers[impostorIndex].player_id;

  // Only generate on first round
  let turnOrder: string[];
  if (roundNumber === 1) {
    turnOrder = [...roomPlayers.map((p) => p.player_id)];
    // Fisher-Yates shuffle
    for (let i = turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
    }
  } else {
    // Use existing turn order from previous round
    const { data: prevRound } = await supabase
      .from("rounds")
      .select("turn_order")
      .eq("room_id", roomId)
      .eq("round_number", roundNumber - 1)
      .single();
    turnOrder = prevRound?.turn_order || [];
  }

  // Calculate end time (this is per-turn timer)
  const endsAt = new Date();
  endsAt.setSeconds(endsAt.getSeconds() + room.round_duration);

  // Create round
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      category: wordPair.category,
      common_word: wordPair.common_word,
      impostor_word: wordPair.impostor_word,
      impostor_player_id: impostorId,
      ends_at: endsAt.toISOString(),
      status: "active",
      turn_order: turnOrder,
      current_turn_index: 0,
      current_sub_round: 1,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/game/room/${roomId}`);
  return round;
}

export async function completeTurn(roundId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Get round info
  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "active") {
    throw new Error("La ronda no está activa");
  }

  // Verify it's this player's turn
  const currentPlayerId = round.turn_order[round.current_turn_index];
  if (currentPlayerId !== playerId) {
    throw new Error("No es tu turno");
  }

  // Record turn completion
  await supabase.from("player_turns").insert({
    round_id: roundId,
    player_id: playerId,
    turn_number: round.current_turn_index,
    sub_round: round.current_sub_round,
  });

  // Get list of active (non-eliminated) players
  const { data: activePlayers } = await supabase
    .from("room_players")
    .select("player_id")
    .eq("room_id", round.room_id)
    .eq("is_eliminated", false);

  const activePlayerIds = new Set(activePlayers?.map((p) => p.player_id) || []);

  // Find next active player in turn order
  let nextTurnIndex = round.current_turn_index + 1;
  let foundNextPlayer = false;

  // Search for next active player (skipping eliminated ones)
  while (nextTurnIndex < round.turn_order.length) {
    const nextPlayerId = round.turn_order[nextTurnIndex];
    if (activePlayerIds.has(nextPlayerId)) {
      foundNextPlayer = true;
      break;
    }
    nextTurnIndex++;
  }

  if (!foundNextPlayer) {
    // No more active players in this cycle - completed a full round of turns
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", round.room_id)
      .single();

    if (!room) throw new Error("Sala no encontrada");

    if (round.current_sub_round >= room.total_rounds) {
      // All sub-rounds complete, start voting
      await supabase
        .from("rounds")
        .update({ status: "voting" })
        .eq("id", roundId);
    } else {
      // Start next sub-round from the beginning, finding first active player
      let firstActiveIndex = 0;
      for (let i = 0; i < round.turn_order.length; i++) {
        if (activePlayerIds.has(round.turn_order[i])) {
          firstActiveIndex = i;
          break;
        }
      }

      const newEndsAt = new Date();
      newEndsAt.setSeconds(newEndsAt.getSeconds() + room.round_duration);

      await supabase
        .from("rounds")
        .update({
          current_turn_index: firstActiveIndex,
          current_sub_round: round.current_sub_round + 1,
          ends_at: newEndsAt.toISOString(),
        })
        .eq("id", roundId);
    }
  } else {
    // Move to next active player
    const { data: roomInfo } = await supabase
      .from("rooms")
      .select("round_duration")
      .eq("id", round.room_id)
      .single();
    const roundDuration = roomInfo?.round_duration || 60;

    const newEndsAt = new Date();
    newEndsAt.setSeconds(newEndsAt.getSeconds() + roundDuration);

    await supabase
      .from("rounds")
      .update({
        current_turn_index: nextTurnIndex,
        ends_at: newEndsAt.toISOString(),
      })
      .eq("id", roundId);
  }

  revalidatePath(`/game/room/${round.room_id}`);
  return { success: true };
}

export async function toggleReady(roomId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Get current ready status
  const { data: roomPlayer } = await supabase
    .from("room_players")
    .select("is_ready")
    .eq("room_id", roomId)
    .eq("player_id", playerId)
    .single();

  if (!roomPlayer) throw new Error("No estás en esta sala");

  // Toggle ready status
  await supabase
    .from("room_players")
    .update({ is_ready: !roomPlayer.is_ready })
    .eq("room_id", roomId)
    .eq("player_id", playerId);

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}

export async function submitVote(roundId: string, votedForId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Check if round is in voting phase
  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "voting") {
    throw new Error("La votación no está activa");
  }

  const { data: roomPlayer } = await supabase
    .from("room_players")
    .select("is_eliminated")
    .eq("room_id", round.room_id)
    .eq("player_id", playerId)
    .single();

  if (roomPlayer?.is_eliminated) {
    throw new Error("Los jugadores eliminados no pueden votar");
  }

  // Check if user is voting for themselves
  if (votedForId === playerId) {
    throw new Error("No puedes votarte a ti mismo");
  }

  // Insert or update vote
  const { error } = await supabase
    .from("votes")
    .upsert(
      {
        round_id: roundId,
        voter_id: playerId,
        voted_for_id: votedForId,
      },
      {
        onConflict: "round_id,voter_id",
      }
    )
    .select();

  if (error) throw error;

  const { count: playerCount } = await supabase
    .from("room_players")
    .select("*", { count: "exact" })
    .eq("room_id", round.room_id)
    .eq("is_eliminated", false);

  const { count: voteCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("round_id", roundId);

  if (playerCount && voteCount && voteCount >= playerCount) {
    // All players voted, process elimination
    await processVoting(round.room_id, roundId);
  }

  revalidatePath(`/game/room/${round.room_id}`);
  return { success: true };
}

async function processVoting(roomId: string, roundId: string) {
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();
  if (!round) return;

  // Count votes
  const { data: votes } = await supabase
    .from("votes")
    .select("*")
    .eq("round_id", roundId);

  const voteCounts: Record<string, number> = {};
  let mostVotedPlayerId: string | null = null;
  let maxVotes = 0;

  if (votes) {
    votes.forEach((vote) => {
      voteCounts[vote.voted_for_id] = (voteCounts[vote.voted_for_id] || 0) + 1;
      if (voteCounts[vote.voted_for_id] > maxVotes) {
        maxVotes = voteCounts[vote.voted_for_id];
        mostVotedPlayerId = vote.voted_for_id;
      }
    });
  }

  // Check if eliminated player is impostor
  const impostorCaught = mostVotedPlayerId === round.impostor_player_id;

  if (impostorCaught) {
    // Impostor caught, go to guess phase
    await supabase
      .from("rounds")
      .update({ status: "guessing" })
      .eq("id", roundId);
  } else {
    // Wrong player, eliminate them
    if (mostVotedPlayerId) {
      await supabase
        .from("room_players")
        .update({ is_eliminated: true })
        .eq("room_id", roomId)
        .eq("player_id", mostVotedPlayerId);
    }

    // Check how many active (non-eliminated) players remain
    const { data: activePlayers } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_eliminated", false);

    const activePlayersCount = activePlayers?.length || 0;

    if (activePlayersCount === 2) {
      // Only 2 players left - game ends with final reveal
      // Save round results showing the game ended
      await supabase.from("round_results").insert({
        round_id: roundId,
        impostor_caught: false,
        most_voted_player_id: mostVotedPlayerId,
        points_awarded: {},
      });

      // Mark round as completed (will show final reveal)
      await supabase
        .from("rounds")
        .update({ status: "completed" })
        .eq("id", roundId);
    } else {
      // More than 2 players remain - continue game with SAME word and impostor
      // Clear votes for the new turn phase
      await supabase.from("votes").delete().eq("round_id", roundId);

      // Reset to turns phase (active) with the SAME word, impostor, and turn order
      // Start from the beginning of turn order, skipping eliminated players
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      const newEndsAt = new Date();
      const roundDuration = room?.round_duration || 60;
      newEndsAt.setSeconds(newEndsAt.getSeconds() + roundDuration);

      await supabase
        .from("rounds")
        .update({
          status: "active",
          current_turn_index: 0,
          current_sub_round: 1, // Reset sub-round counter
          ends_at: newEndsAt.toISOString(),
        })
        .eq("id", roundId);

      // Clear previous turn records for fresh turn tracking
      await supabase.from("player_turns").delete().eq("round_id", roundId);
    }
  }

  revalidatePath(`/game/room/${roomId}`);
}

export async function submitImpostorGuess(
  roundId: string,
  guessedWord: string
) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!round || round.status !== "guessing") {
    throw new Error("No estás en la fase de adivinanza");
  }

  if (round.impostor_player_id !== playerId) {
    throw new Error("Solo el impostor puede adivinar");
  }

  // Check if guess is correct (case-insensitive, trimmed)
  const isCorrect =
    guessedWord.trim().toLowerCase() === round.common_word.trim().toLowerCase();

  // Save guess
  await supabase.from("impostor_guess").insert({
    round_id: roundId,
    impostor_id: playerId,
    guessed_word: guessedWord,
    is_correct: isCorrect,
  });

  // Calculate final points
  const pointsAwarded: Record<string, number> = {};
  const { data: roomPlayers } = await supabase
    .from("room_players")
    .select("player_id, is_eliminated")
    .eq("room_id", round.room_id);

  if (roomPlayers) {
    roomPlayers.forEach((rp) => {
      if (rp.player_id === round.impostor_player_id) {
        // Impostor wins if guess is correct
        pointsAwarded[rp.player_id] = isCorrect ? 3 : 0;
      } else {
        // Group wins if impostor fails
        pointsAwarded[rp.player_id] = isCorrect ? 0 : 1;
      }
    });
  }

  // Save results
  await supabase.from("round_results").insert({
    round_id: roundId,
    impostor_caught: true,
    most_voted_player_id: round.impostor_player_id,
    points_awarded: pointsAwarded,
  });

  // Update scores
  for (const [playerId, points] of Object.entries(pointsAwarded)) {
    const { data: currentScore } = await supabase
      .from("player_scores")
      .select("*")
      .eq("room_id", round.room_id)
      .eq("player_id", playerId)
      .single();

    if (currentScore) {
      await supabase
        .from("player_scores")
        .update({ total_score: currentScore.total_score + points })
        .eq("room_id", round.room_id)
        .eq("player_id", playerId);
    }
  }

  // Check if game should end
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", round.room_id)
    .single();

  if (room && room.current_round >= room.total_rounds) {
    // Game finished
    await supabase
      .from("rooms")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
      })
      .eq("id", round.room_id);
  }

  // Mark round as completed
  await supabase
    .from("rounds")
    .update({ status: "completed" })
    .eq("id", roundId);

  revalidatePath(`/game/room/${round.room_id}`);
  return { success: true, isCorrect };
}

export async function startNextRound(roomId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Verify user is host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room || room.host_player_id !== playerId) {
    throw new Error("Solo el anfitrión puede iniciar la siguiente ronda");
  }

  const nextRound = room.current_round + 1;

  if (nextRound > room.total_rounds) {
    throw new Error("El juego ha terminado");
  }

  // Update room
  await supabase
    .from("rooms")
    .update({ current_round: nextRound })
    .eq("id", roomId);

  // Start next round
  await startRound(roomId, nextRound);

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Check if user is host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (room?.host_player_id === playerId) {
    // HOST IS LEAVING: Delete the room entirely to protect Supabase resources
    // This is a cost-saving measure - rooms only exist while host is present
    // Cascade deletion will handle related records (room_players, rounds, votes, etc.)
    await cleanupRoom(roomId);
  } else {
    // Non-host player leaving: Remove player from room
    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", roomId)
      .eq("player_id", playerId);
  }

  revalidatePath(`/game/room/${roomId}`);
  revalidatePath("/game");
  return { success: true };
}

/**
 * Cleanup helper: Deletes room and all associated data to reduce Supabase usage
 * Called when:
 * - Host leaves the room (leaveRoom)
 * - Host explicitly ends the game (endGame - room deletion optional)
 *
 * This is critical for cost management:
 * - Removes realtime subscriptions
 * - Deletes presence data
 * - Clears all game state
 * - Frees up database resources
 */
async function cleanupRoom(roomId: string) {
  const supabase = await createClient();

  // Delete room - cascade constraints will handle:
  // - room_players
  // - rounds (and nested: player_turns, votes, impostor_guess, round_results)
  // - player_scores
  await supabase.from("rooms").delete().eq("id", roomId);
}

/**
 * Emergency stop: Host can end the game at any time
 * Returns all players to Lobby (Sala de espera)
 * Keeps the room and roster intact (unlike leaveRoom which deletes everything)
 */
export async function endGame(roomId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Verify user is host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room || room.host_player_id !== playerId) {
    throw new Error("Solo el anfitrión puede terminar el juego");
  }

  // Delete all rounds and game state (cascade will clean up votes, turns, etc.)
  await supabase.from("rounds").delete().eq("room_id", roomId);

  // Delete all player scores
  await supabase.from("player_scores").delete().eq("room_id", roomId);

  // Reset all players' eliminated and ready status
  await supabase
    .from("room_players")
    .update({ is_eliminated: false, is_ready: false })
    .eq("room_id", roomId);

  // Reset room to waiting state
  await supabase
    .from("rooms")
    .update({
      status: "waiting",
      current_round: 0,
      started_at: null,
      ended_at: null,
    })
    .eq("id", roomId);

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}

export async function getPlayerWord(roundId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();
  const playerId = player.id;

  // Get round info
  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!round) throw new Error("Ronda no encontrada");

  // Return appropriate word based on whether player is impostor
  const isImpostor = round.impostor_player_id === playerId;

  return {
    word: isImpostor ? round.impostor_word : round.common_word,
    isImpostor,
    category: round.category,
  };
}

export async function updateRoomSettings(
  roomId: string,
  settings: {
    maxPlayers?: number;
    roundDuration?: number;
    totalRounds?: number;
    selectedCategories?: string[];
    selectedDifficulty?: string[];
  }
) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();

  // Get room and verify host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) {
    throw new Error("Sala no encontrada");
  }

  // Verify caller is host
  if (room.host_player_id !== player.id) {
    throw new Error("Solo el anfitrión puede cambiar la configuración");
  }

  // Validate settings
  const updates: Record<string, number | string[]> = {};

  if (settings.maxPlayers !== undefined) {
    if (settings.maxPlayers < 3 || settings.maxPlayers > 12) {
      throw new Error("Máximo de jugadores debe estar entre 3 y 12");
    }
    updates.max_players = settings.maxPlayers;
  }

  if (settings.roundDuration !== undefined) {
    if (settings.roundDuration < 30 || settings.roundDuration > 300) {
      throw new Error("Duración de ronda debe estar entre 30 y 300 segundos");
    }
    updates.round_duration = settings.roundDuration;
  }

  if (settings.totalRounds !== undefined) {
    if (settings.totalRounds < 1 || settings.totalRounds > 10) {
      throw new Error("Total de rondas debe estar entre 1 y 10");
    }
    updates.total_rounds = settings.totalRounds;
  }

  if (settings.selectedCategories !== undefined) {
    if (settings.selectedCategories.length === 0) {
      throw new Error("Debe seleccionar al menos una categoría");
    }
    updates.selected_categories = settings.selectedCategories;
  }

  if (settings.selectedDifficulty !== undefined) {
    if (settings.selectedDifficulty.length === 0) {
      throw new Error("Debe seleccionar al menos un nivel de dificultad");
    }
    updates.selected_difficulty = settings.selectedDifficulty;
  }

  // Update room
  const { error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", roomId);

  if (error) throw error;

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}

export async function kickPlayer(roomId: string, playerId: string) {
  const supabase = await createClient();
  const player = await getCurrentPlayer();

  // Verify caller is host
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room || room.host_player_id !== player.id) {
    throw new Error("Solo el anfitrión puede expulsar jugadores");
  }

  // Can't kick yourself
  if (playerId === player.id) {
    throw new Error("No puedes expulsarte a ti mismo");
  }

  // Remove player
  const { error } = await supabase
    .from("room_players")
    .delete()
    .eq("room_id", roomId)
    .eq("player_id", playerId);

  if (error) throw error;

  revalidatePath(`/game/room/${roomId}`);
  return { success: true };
}
