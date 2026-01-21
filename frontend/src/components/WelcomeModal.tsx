"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, MessageSquare, BarChart3, Sparkles, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import AddIdea from "../app/ideas/components/AddIdea";
import Image from "next/image"
import { useAuthStore } from "@/store/auth_store"

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const first_login = useAuthStore((state) => state.first_login)

  // Garante que o componente está montado antes de verificar o store
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    console.log('WelcomeModal - first_login:', first_login)

    // Mostra o modal apenas se for o primeiro login
    if (first_login === true) {
      console.log('WelcomeModal - Abrindo modal de boas-vindas')
      // Aguarda um pequeno delay para não ser muito agressivo
      setTimeout(() => {
        setOpen(true)
      }, 500)
    }
  }, [first_login, mounted])

  const handleClose = () => {
    setOpen(false)
  }

  const handleCreateIdea = () => {
    setOpen(false)
    // Aguarda um pouco para a animação do modal fechar
    setTimeout(() => {
      // Triggar o botão de criar ideia (se estiver no dashboard)
      const createButton = document.querySelector('[data-create-idea]')
      if (createButton) {
        (createButton as HTMLElement).click()
      }
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center">
              <Image src="/ideahub_icon.png" alt="IdeaHub Icon" width={32} height={32} className="size-12" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Bem-vindo ao IdeaHub! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Sua plataforma para organizar e desenvolver ideias com ajuda de IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">1. Crie suas ideias</h3>
                <p className="text-sm text-muted-foreground">
                  Clique em "Nova Ideia" para começar. Escreva qualquer projeto que você imaginar.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">2. Converse com a IA</h3>
                <p className="text-sm text-muted-foreground">
                  Use o <strong>botão de chat flutuante 💬</strong> no canto inferior direito para tirar dúvidas e receber sugestões.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">3. Acompanhe o progresso</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize suas ideias no Dashboard e veja como elas evoluem ao longo do tempo.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400 mt-0.5">
                BETA
              </Badge>
              <div>
                <p className="text-sm">
                  Estamos em fase beta. Se encontrar bugs, por favor reporte! Seu feedback nos ajuda a melhorar. 🐛
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <AddIdea variant={"primary"}/>
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Explorar Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

