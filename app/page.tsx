"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Home() {
  const [name, setName] = useState("")
  const router = useRouter()

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      // Store name in localStorage and navigate to game
      localStorage.setItem("playerName", name.trim())
      router.push("/game")
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-6 md:p-10">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-block rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-1">
            <div className="rounded-xl bg-background px-6 py-3">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Palabra Impostora
              </h1>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Un juego de deducción social donde debes descubrir al impostor antes de que sea demasiado tarde
          </p>
        </div>

        <Card className="max-w-md mx-auto border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardTitle>Comenzar a Jugar</CardTitle>
            <CardDescription>Ingresa tu nombre para empezar</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleStart} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  required
                  className="text-lg"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!name.trim()}>
                Continuar
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="text-primary">Cómo Jugar</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                Cada jugador recibe una palabra. El impostor recibe una palabra diferente pero relacionada. Todos
                describen su palabra sin revelarla directamente.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 hover:border-secondary/40 transition-colors">
            <CardHeader>
              <CardTitle className="text-secondary">Descubre</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                Lee las descripciones de los demás jugadores y trata de identificar quién tiene la palabra diferente.
                ¿Puedes encontrar al impostor?
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent/40 transition-colors">
            <CardHeader>
              <CardTitle className="text-accent">Gana Puntos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                Vota por quien crees que es el impostor. Si aciertas, ganas puntos. Si eres el impostor y no te
                descubren, ¡ganas más puntos!
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
