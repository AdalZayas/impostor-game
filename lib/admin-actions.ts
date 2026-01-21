"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Función para agregar nuevas palabras secretas al juego
 * Solo la palabra que conocen todos los jugadores excepto el impostor
 */
export async function addWordPairs(
  words: Array<{
    secret_word: string;
    language?: string;
  }>
) {
  const supabase = await createClient();

  const formattedWords = words.map((word) => ({
    ...word,
    language: word.language || "es",
    is_active: true,
  }));

  const { error } = await supabase.from("word_pairs").insert(formattedWords);

  if (error) {
    throw new Error(`Error al agregar palabras: ${error.message}`);
  }

  return { success: true, count: words.length };
}

// Ejemplo de uso:
export async function addExampleWords() {
  const newWords = [
    // Objetos
    { secret_word: "Silla" },
    { secret_word: "Mesa" },
    { secret_word: "Cama" },
    { secret_word: "Refrigerador" },

    // Emociones
    { secret_word: "Alegría" },
    { secret_word: "Tristeza" },
    { secret_word: "Miedo" },
    { secret_word: "Amor" },

    // Clima
    { secret_word: "Lluvia" },
    { secret_word: "Sol" },
    { secret_word: "Nieve" },
    { secret_word: "Viento" },
  ];

  return await addWordPairs(newWords);
}
