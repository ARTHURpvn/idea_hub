"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import {Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react"
import { ScrollArea } from "./ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "./ui/input";
import { Button } from "./ui/button";


interface Message {
    id: number
    sender: "user" | "ai"
    text: string
}

interface ChatProps {
    open: boolean
    setOpen: (open: boolean) => void
}

const AIChat = ({open, setOpen}: ChatProps) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, sender: "ai", text: "Olá! Como posso ajudar a refinar sua ideia hoje?" },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
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


    return(
        <Sheet open={open} onOpenChange={setOpen}>
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

    )
}

export default AIChat