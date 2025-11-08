"use client"

import { useState, useEffect } from "react"
import { JSONContent } from "@tiptap/react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { MessageCircle, Loader2, Send, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// SimpleEditor (inline mode when embutido)
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { useIdeaStore } from "@/store/idea_store"
import { getIdeaById } from "@/requests/idea_reqs"

interface Message {
    id: number
    sender: "user" | "ai"
    text: string
}

export default function IdeaNotesPage() {
    // sheet open state for lateral chat
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, sender: "ai", text: "Olá! Como posso ajudar a refinar sua ideia hoje?" },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)

    // Editor Tiptap
    const [ideaContent, setIdeaContent] = useState<string | JSONContent | undefined>(undefined)
    const [ideaLoading, setIdeaLoading] = useState(false)
    const params = useParams()
    // normalize id from params (handle string | string[])
    const ideaId = Array.isArray(params?.id) ? params?.id[0] ?? "" : (params?.id ?? "")
    const idea_id = String(ideaId || "")

    // attempt to find idea first in recentIdeas (fast), then in full responses
    const recent = useIdeaStore((state) => state.recentIdeas) || []
    const responses = useIdeaStore((state) => state.responses) || []
    // comparison normalized to string to avoid number vs string mismatch
    const idea = recent.find((i) => String(i.id) === idea_id) || responses.find((r) => String(r.id) === idea_id)

    // Load idea content on mount or when idea_id changes
    useEffect(() => {
        let mounted = true
        const load = async () => {
            if (!idea_id) {
                setIdeaLoading(false)
                return
            }

            setIdeaLoading(true)

            // Try to get from store first
            const storeIdea = recent.find((i) => String(i.id) === idea_id) || responses.find((r) => String(r.id) === idea_id)
            if (storeIdea && (storeIdea as any).raw_content !== undefined) {
                if (mounted) {
                    console.log('[page] setting ideaContent from store:', (storeIdea as any).raw_content);
                    setIdeaContent((storeIdea as any).raw_content as string | JSONContent)
                    setIdeaLoading(false)
                }
                return
            }

            // Otherwise fetch from server
            try {
                const server = await getIdeaById(idea_id)
                if (mounted && server) {
                    console.log('[page] setting ideaContent from server:', server.raw_content);
                    setIdeaContent(server.raw_content ?? "")
                }
            } catch (err) {
                console.warn('failed to fetch idea by id', err)
            } finally {
                if (mounted) setIdeaLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [idea_id])

    const handleSend = async () => {
        if (!input.trim()) return
        const userMessage: Message = { id: Date.now(), sender: "user", text: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setLoading(true)

        // Simulação de resposta IA
        setTimeout(() => {
            const aiMessage: Message = {
                id: Date.now() + 1,
                sender: "ai",
                text: "Interessante! Já pensou em como essa ideia pode gerar valor?",
            }
            setMessages((prev) => [...prev, aiMessage])
            setLoading(false)
        }, 1200)
    }

    return (
        <div className="relative w-full max-w-7xl mx-auto my-6 p-4 bg-card rounded-lg h-[93dvh] overflow-hidden">
            {/* Editor */}
            <div className="w-full">
                <SimpleEditor
                    idea_id={idea_id}
                    annotation={ideaContent}
                />
            </div>

            {/* Botão flutuante de chat (abre Sheet lateral) */}
            <motion.div
                className="fixed bottom-6 right-6 z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Button
                    size="lg"
                    className="rounded-full shadow-xl"
                    onClick={() => setIsChatOpen(true)}
                    aria-expanded={isChatOpen}
                    aria-controls="ai-chat-sheet"
                >
                    <MessageCircle className="w-5 h-5" />
                </Button>
            </motion.div>

            {/* Sheet lateral de chat */}
            <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                <SheetContent side="right">
                    <SheetHeader className={"border-b"}>
                        <SheetTitle className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            Chat com a IA
                        </SheetTitle>
                        <div className="text-sm text-muted-foreground">Inteligencia Artificial</div>
                    </SheetHeader>

                    <div className="p-4 pt-0">
                        <ScrollArea className="h-[60vh] pr-2 mt-2">
                            <div className="flex flex-col gap-3">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[75%] p-3 rounded-xl text-sm ${
                                                    msg.sender === "user"
                                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                                        : "bg-muted text-foreground rounded-tl-none"
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {loading && (
                                    <div className="flex justify-start items-center gap-2 text-muted-foreground text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        A IA está pensando...
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                    </div>

                    <SheetFooter className="border-t">
                        <div className="flex gap-2 pt-3">
                            <Input
                                placeholder="Escreva uma mensagem..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <Button onClick={ handleSend} disabled={loading || !input.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
