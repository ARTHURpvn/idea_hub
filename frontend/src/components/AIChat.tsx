"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClockIcon, Loader2, PlusIcon, Send, Sparkles, Trash2, MessageSquare, X } from "lucide-react";
import {useEffect, useState, useRef } from "react"
import { ScrollArea } from "./ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat_store";

interface Message {
    id: number
    sender: "User" | "AI"
    text: string
}

interface Chat {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    lastMessageAt: Date
}

interface ChatProps {
    open: boolean
    setOpen: (open: boolean) => void
    idea_id: string
}

const AIChat = ({open, setOpen, idea_id}: ChatProps) => {
    // State
    const [currentChatId, setCurrentChatId] = useState<string | null>()
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [currentView, setCurrentView] = useState<"chat" | "history">("chat")
    const isInitializedRef = useRef(false)
    const [chats, setChats] = useState<any[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Subscribe to store updates manually
    useEffect(() => {
        const unsubscribe = useChatStore.subscribe((state) => {
            const filteredChats = state.chats.filter(c => c.idea_id === idea_id)
            setChats(filteredChats)
        })

        // Initial load
        const initialChats = useChatStore.getState().chats.filter(c => c.idea_id === idea_id)
        setChats(initialChats)

        return unsubscribe
    }, [idea_id])

    // Load chats and initialize when sheet opens
    useEffect(() => {
        if (!open) {
            isInitializedRef.current = false
            return
        }

        if (isInitializedRef.current) return
        isInitializedRef.current = true

        const initializeChat = async () => {
            await useChatStore.getState().mapChats()

            // Get the latest chats after loading
            const latestChats = useChatStore.getState().ideaChats(idea_id)

            if (latestChats.length > 0) {
                setCurrentChatId(latestChats[0].chat_id)
            } else {
                const newChatId = await useChatStore.getState().createChat(idea_id)
                if (newChatId) {
                    setCurrentChatId(newChatId)
                }
            }
        }

        initializeChat()
    }, [open, idea_id])

    // Get current chat
    const currentChat = chats.find(chat => chat.chat_id === currentChatId)
    const messages = currentChat?.messages || []

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, loading])

    const handleSend = async () => {
        if (!input.trim()) return

        const messageText = input.trim()
        setInput("") // Clear input immediately

        // If no chat exists, create one first
        if (!currentChat) {
            setLoading(true)
            const newChatId = await useChatStore.getState().createChat(idea_id)
            if (!newChatId) {
                setLoading(false)
                return
            }
            setCurrentChatId(newChatId)

            // Add optimistic message (show immediately)
            useChatStore.getState().addOptimisticMessage(newChatId, messageText)
            setLoading(true)

            // Send message to the new chat
            await useChatStore.getState().sendMessage(newChatId, messageText)
            setLoading(false)
            return
        }

        // Add optimistic message (show user message immediately)
        useChatStore.getState().addOptimisticMessage(currentChat.chat_id, messageText)
        setLoading(true)

        // Send message to existing chat (this will refresh with real data)
        await useChatStore.getState().sendMessage(currentChat.chat_id, messageText)
        setLoading(false)
    }

    // Create new chat
    const handleNewChat = () => {
        useChatStore.getState().createChat(idea_id).then(chat => {
            if(!chat) return
            setCurrentChatId(chat)
        })

        setCurrentView("chat")
    }

    // Handle input focus - create chat if none exists
    const handleInputFocus = async () => {
        if (!currentChat && chats.length === 0) {
            const newChatId = await useChatStore.getState().createChat(idea_id)
            if (newChatId) {
                setCurrentChatId(newChatId)
            }
        }
    }

    // Switch to a different chat
    const handleSelectChat = (chatId: string) => {
        setCurrentChatId(chatId)
        setCurrentView("chat")
    }

    // Delete a chat
    const handleDeleteChat = (chatId: string) => {
        useChatStore.getState().deleteChat(chatId)

        // If deleting current chat, select another one
        if (chatId === currentChatId) {
            const remainingChats = chats.filter(c => c.chat_id !== chatId)
            if (remainingChats.length > 0) {
                setCurrentChatId(remainingChats[0].chat_id)
            } else {
                setCurrentChatId(null)
            }
        }
    }

    return(
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 flex flex-col"
                showClose={false}
            >
                {/* Header */}
                <SheetHeader className="border-b px-6 py-5 bg-gradient-to-br from-primary/10 via-secondary/5 to-background backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary rounded-xl blur-md opacity-50" />
                                <div className="relative p-2.5 rounded-xl bg-primary shadow-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="font-bold text-lg bg-primary bg-clip-text text-transparent">
                                    Chat com IA
                                </div>
                                <div className="text-xs text-muted-foreground font-normal flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Assistente Online
                                </div>
                            </div>
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentView(currentView === "history" ? "chat" : "history")}
                                className={cn(
                                    "gap-2 transition-all duration-200 hover:scale-105",
                                    currentView === "history"
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                        : "hover:bg-accent"
                                )}
                            >
                                <ClockIcon className="w-4 h-4"/>
                                <span className="hidden sm:inline font-medium">Histórico</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNewChat}
                                className="gap-2 transition-all duration-200 hover:scale-105 hover:bg-primary/10 hover:text-primary"
                            >
                                <PlusIcon className="w-4 h-4"/>
                                <span className="hidden sm:inline font-medium">Novo</span>
                            </Button>
                            {/* Botão Fechar - Visível em Mobile */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpen(false)}
                                className="sm:hidden gap-2 transition-all duration-200 hover:scale-105 hover:bg-destructive/10 hover:text-destructive"
                                title="Fechar chat"
                            >
                                <X className="w-5 h-5"/>
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content Area - Conditional Rendering */}
                {currentView === "history" ? (
                    // History View
                    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
                        <div className="p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                        Suas Conversas
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                        {chats.length} {chats.length === 1 ? "conversa" : "conversas"} salva{chats.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                {chats.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/20 text-primary shadow-sm">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-sm font-bold">{chats.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="px-6 pb-6 space-y-2">
                                {chats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-xl" />
                                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 flex items-center justify-center">
                                                <MessageSquare className="w-10 h-10 text-primary" />
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-base mb-2">Nenhuma conversa ainda</h4>
                                        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                                            Comece uma nova conversa com a IA para ver seu histórico aqui
                                        </p>
                                        <Button
                                            onClick={handleNewChat}
                                            className="mt-6 gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Iniciar Conversa
                                        </Button>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {chats.map((chat, index) => {
                                            const lastMessage = chat.messages[chat.messages.length - 1]
                                            const firstUserMessage = chat.messages.find((m: any) => m.sender === "USER")
                                            const messageCount = chat.messages.length

                                            return (
                                                <motion.div
                                                    key={chat.chat_id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                                    className={cn(
                                                        "group relative rounded-xl cursor-pointer transition-all border",
                                                        "hover:shadow-md hover:border-primary/30",
                                                        chat.chat_id === currentChatId
                                                            ? "bg-primary/5 border-primary/40 shadow-sm"
                                                            : "bg-card hover:bg-accent/50"
                                                    )}
                                                    onClick={() => handleSelectChat(chat.chat_id)}
                                                >
                                                    <div className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            {/* Icon */}
                                                            <div className={cn(
                                                                "p-2.5 rounded-lg flex-shrink-0 transition-colors",
                                                                chat.chat_id === currentChatId
                                                                    ? "bg-primary/20"
                                                                    : "bg-primary/10 group-hover:bg-primary/15"
                                                            )}>
                                                                <MessageSquare className={cn(
                                                                    "w-4 h-4 transition-colors",
                                                                    chat.chat_id === currentChatId
                                                                        ? "text-primary"
                                                                        : "text-primary/70"
                                                                )} />
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                {/* Title/First Message */}
                                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                                    <h4 className="text-sm font-medium line-clamp-1 flex-1">
                                                                        {firstUserMessage?.message || "Nova conversa"}
                                                                    </h4>
                                                                    {chat.chat_id === currentChatId && (
                                                                        <div className="flex-shrink-0">
                                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Last Message Preview */}
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                                    {lastMessage?.sender === "AI" && (
                                                                        <span className="inline-flex items-center gap-1 mr-1">
                                                                            <Sparkles className="w-3 h-3" />
                                                                        </span>
                                                                    )}
                                                                    {lastMessage?.message || "Sem mensagens"}
                                                                </p>

                                                                {/* Footer Info */}
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="flex items-center gap-1">
                                                                            <MessageSquare className="w-3 h-3" />
                                                                            {messageCount} {messageCount === 1 ? "mensagem" : "mensagens"}
                                                                        </span>
                                                                    </div>

                                                                    {/* Delete Button */}
                                                                    {chats.length > 1 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className={cn(
                                                                                "h-7 w-7 p-0 transition-all",
                                                                                "opacity-0 group-hover:opacity-100",
                                                                                "hover:bg-destructive/10 hover:text-destructive"
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleDeleteChat(chat.chat_id)
                                                                            }}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Active Indicator */}
                                                    {chat.chat_id === currentChatId && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                                    )}
                                                </motion.div>
                                            )
                                        })}
                                    </AnimatePresence>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    // Chat View
                    <div className="flex-1 flex flex-col overflow-hidden h-full">
                        {/* Messages */}
                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-6 py-6 px-6">
                                {/* Welcome message when chat is empty */}
                                {messages.length === 0 && !loading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center py-12 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                                            <Sparkles className="w-8 h-8 text-primary" />
                                        </div>
                                        <h4 className="font-semibold text-lg mb-2">Como posso ajudar?</h4>
                                        <p className="text-sm text-muted-foreground max-w-[280px]">
                                            Faça perguntas sobre sua ideia, peça sugestões ou explore possibilidades!
                                        </p>
                                    </motion.div>
                                )}

                                <AnimatePresence initial={false} mode="popLayout">
                                    {messages.map((msg: any, index: number) => (
                                        <motion.div
                                            key={msg.message_id}
                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{
                                                duration: 0.3,
                                                ease: "easeOut"
                                            }}
                                            className={`flex gap-3 ${msg.sender === "USER" ? "flex-row-reverse" : "flex-row"} items-start`}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                                                msg.sender === "USER"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-primary/20"
                                            )}>
                                                {msg.sender === "USER" ? (
                                                    <span className="text-sm font-semibold">Você</span>
                                                ) : (
                                                    <Sparkles className="w-5 h-5 text-primary" />
                                                )}
                                            </div>

                                            {/* Message bubble */}
                                            <div className={cn(
                                                "flex flex-col gap-1",
                                                msg.sender === "USER" ? "items-end" : "items-start",
                                                "max-w-[75%]"
                                            )}>
                                                {/* Sender name */}
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {msg.sender === "USER" ? "Você" : "Assistente IA"}
                                                    </span>
                                                </div>

                                                {/* Message content */}
                                                <div
                                                    className={cn(
                                                        "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                                        "transition-all duration-200",
                                                        msg.sender === "USER"
                                                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md"
                                                            : "bg-card text-foreground rounded-tl-md border-2 border-border hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="whitespace-pre-wrap break-words">
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Loading indicator */}
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3 items-start"
                                    >
                                        {/* Avatar */}
                                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-primary/20 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>

                                        {/* Loading bubble */}
                                        <div className="flex flex-col gap-1 max-w-[75%]">
                                            <div className="text-xs font-medium text-muted-foreground px-1">
                                                Assistente IA
                                            </div>
                                            <div className="bg-card text-foreground p-4 rounded-2xl rounded-tl-md border-2 border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                                            className="w-2 h-2 rounded-full bg-primary"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                                            className="w-2 h-2 rounded-full bg-primary"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                                            className="w-2 h-2 rounded-full bg-primary"
                                                        />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        Pensando...
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Invisible div to scroll to */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="border-t bg-gradient-to-b from-background/50 to-background backdrop-blur-sm p-4 flex-shrink-0">
                            <div className="max-w-4xl mx-auto">
                                {/* Typing hint */}
                                {input.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 mb-2 text-xs text-muted-foreground px-1"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        <span>Shift + Enter para nova linha • Enter para enviar</span>
                                    </motion.div>
                                )}

                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 relative">
                                        <textarea
                                            placeholder="💬 Pergunte qualquer coisa sobre sua ideia..."
                                            value={input}
                                            onChange={(e) => {
                                                setInput(e.target.value)
                                                // Auto-resize
                                                e.target.style.height = 'auto'
                                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
                                            }}
                                            onFocus={handleInputFocus}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSend()
                                                }
                                            }}
                                            rows={1}
                                            disabled={loading}
                                            className={cn(
                                                "w-full resize-none rounded-2xl border-2 bg-background/50",
                                                "px-4 py-3 text-sm leading-relaxed",
                                                "transition-all duration-200",
                                                "focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20",
                                                "placeholder:text-muted-foreground/60",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "min-h-[52px] max-h-[200px]",
                                                "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                                            )}
                                            style={{
                                                outline: 'none',
                                                lineHeight: '1.5'
                                            }}
                                        />

                                        {/* Character counter for long messages */}
                                        {input.length > 500 && (
                                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
                                                {input.length}/2000
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleSend}
                                        disabled={loading || !input.trim()}
                                        size="lg"
                                        className={cn(
                                            "h-[52px] px-6 rounded-2xl transition-all duration-200",
                                            "shadow-lg hover:shadow-xl",
                                            input.trim()
                                                ? "bg-primary"
                                                : "",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                            "group relative overflow-hidden"
                                        )}
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                <span className="ml-2 hidden sm:inline font-medium">Enviar</span>
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Quick actions / suggestions (optional - shown when input is empty) */}
                                {!input && messages.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="mt-3 flex flex-wrap gap-2"
                                    >
                                        {[
                                            "Como posso melhorar esta ideia?",
                                            "Que tecnologias devo usar?",
                                            "Quais são os próximos passos?"
                                        ].map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInput(suggestion)}
                                                className="text-xs px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border/50 hover:border-primary/30"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>

    )
}

export default AIChat