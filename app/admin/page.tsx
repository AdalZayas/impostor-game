"use client";

import { useState } from "react";
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
import { addWordPairs } from "@/lib/admin-actions";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export default function AdminPanel() {
  const [secretWord, setSecretWord] = useState("");
  const [language, setLanguage] = useState("es");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!secretWord) {
      setMessage("La palabra secreta es obligatoria");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await addWordPairs([
        {
          secret_word: secretWord,
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
        </CardContent>
      </Card>
    </div>
  );
}
