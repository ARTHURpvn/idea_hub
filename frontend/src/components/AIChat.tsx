"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClockIcon, Loader2, PlusIcon, Send, Sparkles, Trash2, MessageSquare } from "lucide-react";
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
                <SheetHeader className="border-b px-6 py-4 bg-gradient-to-r from-primary/5 to-secondary/5">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div className="font-bold">Chat com IA</div>
                                <div className="text-xs text-muted-foreground font-normal">
                                    Assistente Inteligente
                                </div>
                            </div>
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentView(currentView === "history" ? "chat" : "history")}
                                className={cn(
                                    "gap-2 transition-colors",
                                    currentView === "history" && "bg-accent"
                                )}
                            >
                                <ClockIcon className="w-4 h-4"/>
                                <span className="hidden sm:inline">Histórico</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNewChat}
                                className="gap-2"
                            >
                                <PlusIcon className="w-4 h-4"/>
                                <span className="hidden sm:inline">Novo</span>
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content Area - Conditional Rendering */}
                {currentView === "history" ? (
                    // History View
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-semibold text-lg">Suas Conversas</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {chats.length} {chats.length === 1 ? "conversa" : "conversas"} salva{chats.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                {chats.length > 0 && (
                                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">{chats.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="px-6 pb-6 space-y-2">
                                {chats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <MessageSquare className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h4 className="font-medium text-sm mb-1">Nenhuma conversa ainda</h4>
                                        <p className="text-xs text-muted-foreground max-w-[200px]">
                                            Comece uma nova conversa com a IA para ver seu histórico aqui
                                        </p>
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
                            <div className="flex flex-col gap-4 py-4 px-6">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {messages.map((msg: any) => (
                                        <motion.div
                                            key={msg.message_id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[80%] p-4 rounded-2xl text-sm shadow-sm",
                                                    msg.sender === "USER"
                                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                        : "bg-muted text-foreground rounded-tl-sm border"
                                                )}
                                            >
                                                {msg.sender === "AI" && (
                                                    <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                                                        <Sparkles className="w-3 h-3" />
                                                        <span>Assistente IA</span>
                                                    </div>
                                                )}
                                                <div className="whitespace-pre-wrap">{msg.message}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-muted text-foreground p-4 rounded-2xl rounded-tl-sm border max-w-[80%]">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                <span className="text-sm text-muted-foreground">
                                                    A IA está pensando...
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Invisible div to scroll to */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="border-t bg-card p-4 flex-shrink-0">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Input
                                        placeholder="Digite sua mensagem..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onFocus={handleInputFocus}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSend()
                                            }
                                        }}
                                        className="pr-12 h-11 rounded-xl"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        Enter
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSend}
                                    disabled={loading || !input.trim()}
                                    size="lg"
                                    className="h-11 px-5 rounded-xl"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>

    )
}

export default AIChat