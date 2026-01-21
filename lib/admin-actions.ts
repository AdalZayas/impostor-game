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
  try {
    const supabase = await createClient();

    // Verificar si alguna palabra ya existe
    const wordsToCheck = words.map((word) => ({
      secret_word: word.secret_word.toLowerCase().trim(),
      language: word.language || "es",
    }));

    for (const wordToCheck of wordsToCheck) {
      // Primero intentar con la nueva estructura (secret_word)
      const { data: existingWord, error } = await supabase
        .from("word_pairs")
        .select("secret_word")
        .ilike("secret_word", wordToCheck.secret_word)
        .eq("language", wordToCheck.language)
        .eq("is_active", true)
        .maybeSingle();

      // Si hay error, puede ser que la columna secret_word no exista aún
      // Intentar con la estructura anterior (common_word)
      if (error) {
        const { data: oldStructureWord } = await supabase
          .from("word_pairs")
          .select("common_word")
          .ilike("common_word", wordToCheck.secret_word)
          .eq("language", wordToCheck.language)
          .eq("is_active", true)
          .maybeSingle();

        if (oldStructureWord) {
          throw new Error(
            `La palabra "${wordToCheck.secret_word}" ya existe en el juego`
          );
        }
      } else if (existingWord) {
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

    const { error: insertError } = await supabase
      .from("word_pairs")
      .insert(formattedWords);

    if (insertError) {
      // Si falla con secret_word, puede ser que la tabla tenga la estructura anterior
      if (
        insertError.message.includes(
          'column "secret_word" of relation "word_pairs" does not exist'
        )
      ) {
        throw new Error(
          "La base de datos necesita ser actualizada. Por favor ejecuta el script de migración 004_simplify_words_system.sql"
        );
      }
      throw new Error(`Error al agregar palabras: ${insertError.message}`);
    }

    return { success: true, count: words.length };
  } catch (error) {
    // Re-lanzar el error para que sea manejado por el componente
    throw error;
  }
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

/**
 * Función para diagnosticar el estado de la base de datos
 */
export async function diagnoseDatabaseStructure() {
  const supabase = await createClient();

  try {
    // Intentar obtener información sobre la estructura de la tabla
    const { data, error } = await supabase
      .from("word_pairs")
      .select("*")
      .limit(1);

    if (error) {
      return {
        status: "error",
        message: `Error al acceder a word_pairs: ${error.message}`,
        error: error,
      };
    }

    if (!data || data.length === 0) {
      return {
        status: "empty",
        message: "La tabla word_pairs existe pero está vacía",
        columns: [],
      };
    }

    const columns = Object.keys(data[0]);
    const hasNewStructure = columns.includes("secret_word");
    const hasOldStructure =
      columns.includes("common_word") && columns.includes("impostor_word");

    return {
      status: "success",
      message: `Tabla word_pairs encontrada con ${data.length} registro(s)`,
      columns: columns,
      hasNewStructure,
      hasOldStructure,
      needsMigration: hasOldStructure && !hasNewStructure,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Error inesperado: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error: error,
    };
  }
}
