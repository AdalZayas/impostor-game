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

  // Verificar si alguna palabra ya existe
  const wordsToCheck = words.map((word) => ({
    secret_word: word.secret_word.toLowerCase().trim(),
    language: word.language || "es",
  }));

  for (const wordToCheck of wordsToCheck) {
    const { data: existingWord } = await supabase
      .from("word_pairs")
      .select("secret_word")
      .ilike("secret_word", wordToCheck.secret_word)
      .eq("language", wordToCheck.language)
      .eq("is_active", true)
      .single();

    if (existingWord) {
      throw new Error(
        `La palabra "${wordToCheck.secret_word}" ya existe en el juego`
      );
    }
  }

  const formattedWords = words.map((word) => ({
    secret_word: word.secret_word.trim(),
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

/**
 * Función para verificar si una palabra ya existe
 */
export async function checkWordExists(
  secretWord: string,
  language: string = "es"
) {
  const supabase = await createClient();

  const { data: existingWord } = await supabase
    .from("word_pairs")
    .select("secret_word, language")
    .ilike("secret_word", secretWord.toLowerCase().trim())
    .eq("language", language)
    .eq("is_active", true)
    .single();

  return !!existingWord;
}

/**
 * Función para obtener todas las palabras existentes
 */
export async function getAllWords(language: string = "es") {
  const supabase = await createClient();

  const { data: words, error } = await supabase
    .from("word_pairs")
    .select("secret_word, language, created_at")
    .eq("language", language)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener palabras: ${error.message}`);
  }

  return words || [];
}
