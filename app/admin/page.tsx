"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addWordPairs, diagnoseDatabaseStructure } from "@/lib/admin-actions";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export default function AdminPanel() {
  const [secretWord, setSecretWord] = useState("");
  const [language, setLanguage] = useState("es");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [diagnostic, setDiagnostic] = useState<{
    status: string;
    message: string;
    columns?: string[];
    hasNewStructure?: boolean;
    hasOldStructure?: boolean;
    needsMigration?: boolean;
  } | null>(null);

  useEffect(() => {
    // Ejecutar diagnóstico al cargar el componente
    const runDiagnostic = async () => {
      try {
        const result = await diagnoseDatabaseStructure();
        setDiagnostic(result);
      } catch (error) {
        console.error("Error en diagnóstico:", error);
      }
    };
    runDiagnostic();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedWord = secretWord.trim();

    if (!trimmedWord) {
      setMessage("La palabra secreta es obligatoria");
      return;
    }

    if (trimmedWord.length < 2) {
      setMessage("La palabra debe tener al menos 2 caracteres");
      return;
    }

    if (trimmedWord.length > 50) {
      setMessage("La palabra no puede tener más de 50 caracteres");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await addWordPairs([
        {
          secret_word: trimmedWord,
          language,
        },
      ]);

      setMessage("¡Palabra secreta agregada exitosamente!");

      // Limpiar formulario
      setSecretWord("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al agregar palabras"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Panel de Administración - Agregar Palabras</CardTitle>
          <CardDescription>
            Agrega nuevas palabras secretas para el juego &quot;Impostor de la
            Palabra&quot;. El impostor NO conoce esta palabra y debe fingir que
            sí la conoce.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="secretWord">Palabra Secreta</Label>
              <Input
                id="secretWord"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                placeholder="Ej: Perro"
              />
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Agregando..." : "Agregar Palabra Secreta"}
            </Button>

            {message && (
              <div
                className={`p-3 rounded ${
                  message.includes("exitosamente")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">
              💡 Consejos para elegir buenas palabras secretas:
            </h3>
            <ul className="text-sm space-y-1">
              <li>
                • Usa sustantivos concretos que se puedan describir fácilmente
              </li>
              <li>
                • El impostor debe poder inventar descripciones creíbles sin
                saber la palabra
              </li>
              <li>• Ejemplos buenos: Perro, Pizza, Guitarra, Hospital</li>
              <li>• Evita conceptos abstractos o muy específicos</li>
              <li>
                • La palabra debe ser conocida por la mayoría de jugadores
              </li>
            </ul>
          </div>

          {diagnostic && (
            <div className="mt-8 p-4 bg-yellow-50 rounded border">
              <h3 className="font-semibold mb-2">
                🔍 Diagnóstico de Base de Datos:
              </h3>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Estado:</strong> {diagnostic.status}
                </p>
                <p>
                  <strong>Mensaje:</strong> {diagnostic.message}
                </p>
                {diagnostic.columns && (
                  <p>
                    <strong>Columnas encontradas:</strong>{" "}
                    {diagnostic.columns.join(", ")}
                  </p>
                )}
                {diagnostic.needsMigration && (
                  <div className="mt-2 p-2 bg-orange-100 rounded">
                    <p className="text-orange-800 font-medium">
                      ⚠️ Se necesita migración: La base de datos tiene la
                      estructura anterior. Ejecuta el script{" "}
                      <code>004_simplify_words_system.sql</code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
