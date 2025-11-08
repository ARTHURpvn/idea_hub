"use client"

import { useState, useEffect } from "react"
import { JSONContent } from "@tiptap/react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Loader2, Send, Sparkles, Edit3, Map, ChevronLeft, Trash2, Save, Plus, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

// SimpleEditor (inline mode when embutido)
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { useIdeaStore } from "@/store/idea_store"
import { getIdeaById, updateIdea, deleteIdea, Status, IdeaDTO } from "@/requests/idea_reqs"
import { getRoadmapById, createRoadmap, Roadmap } from "@/requests/roadmap_reqs"

interface Message {
    id: number
    sender: "user" | "ai"
    text: string
}

export default function IdeaNotesPage() {
    const router = useRouter()

    // sheet open state for lateral chat
    const [isChatOpen, setIsChatOpen] = useState(false)

    // Dialog states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isRoadmapDialogOpen, setIsRoadmapDialogOpen] = useState(false)

    // Edit form states
    const [editTitle, setEditTitle] = useState("")
    const [editStatus, setEditStatus] = useState<string>("")
    const [editTags, setEditTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState("")

    // Roadmap states
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
    const [roadmapLoading, setRoadmapLoading] = useState(false)
    const [generatingRoadmap, setGeneratingRoadmap] = useState(false)

    const [messages, setMessages] = useState<Message[]>([
        { id: 1, sender: "ai", text: "Olá! Como posso ajudar a refinar sua ideia hoje?" },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)

    // Editor Tiptap
    const [ideaContent, setIdeaContent] = useState<string | JSONContent | undefined>(undefined)
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
                return
            }

            // Try to get from store first
            const storeIdea = recent.find((i) => String(i.id) === idea_id) || responses.find((r) => String(r.id) === idea_id)
            if (storeIdea && (storeIdea as any).raw_content !== undefined) {
                if (mounted) {
                    console.log('[page] setting ideaContent from store:', (storeIdea as any).raw_content);
                    setIdeaContent((storeIdea as any).raw_content as string | JSONContent)
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

    // Open edit dialog and populate fields
    const handleOpenEditDialog = () => {
        if (idea) {
            setEditTitle(idea.title || "")
            setEditStatus(idea.status || Status.DRAFT)
            setEditTags(idea.tags || [])
        }
        setIsEditDialogOpen(true)
    }

    // Save edited idea
    const handleSaveEdit = async () => {
        if (!idea_id) return

        const payload: Partial<IdeaDTO> = {
            id: idea_id,
            title: editTitle,
            status: editStatus,
            tags: editTags,
        }

        const result = await updateIdea(payload)
        if (result) {
            toast.success("Ideia atualizada com sucesso!")
            setIsEditDialogOpen(false)
            // Refresh idea data
            const updated = await getIdeaById(idea_id)
            if (updated) {
                // Update store if needed
                useIdeaStore.getState().updateIdea({
                    id: idea_id,
                    title: updated.title,
                    status: updated.status,
                    tags: updated.tags,
                })
            }
        } else {
            toast.error("Erro ao atualizar ideia")
        }
    }

    // Delete idea
    const handleDeleteIdea = async () => {
        if (!idea_id) return

        if (confirm("Tem certeza que deseja excluir esta ideia?")) {
            const result = await deleteIdea(idea_id)
            if (result) {
                toast.success("Ideia excluída com sucesso!")
                router.push("/ideas")
            } else {
                toast.error("Erro ao excluir ideia")
            }
        }
    }

    // Add tag
    const handleAddTag = () => {
        if (newTag.trim() && !editTags.includes(newTag.trim())) {
            setEditTags([...editTags, newTag.trim()])
            setNewTag("")
        }
    }

    // Remove tag
    const handleRemoveTag = (tag: string) => {
        setEditTags(editTags.filter(t => t !== tag))
    }

    // Load or generate roadmap
    const handleViewRoadmap = async () => {
        if (!idea_id) return

        setIsRoadmapDialogOpen(true)
        setRoadmapLoading(true)

        try {
            const existingRoadmap = await getRoadmapById(idea_id)
            if (existingRoadmap && typeof existingRoadmap === 'object') {
                setRoadmap(existingRoadmap)
            } else {
                setRoadmap(null)
            }
        } catch (err) {
            console.error("Error loading roadmap:", err)
            setRoadmap(null)
        } finally {
            setRoadmapLoading(false)
        }
    }

    // Generate new roadmap
    const handleGenerateRoadmap = async () => {
        if (!idea_id) return

        setGeneratingRoadmap(true)

        try {
            const result = await createRoadmap(idea_id, "web")
            if (result) {
                toast.success("Roadmap gerado com sucesso!")
                // Reload roadmap
                const newRoadmap = await getRoadmapById(idea_id)
                if (newRoadmap && typeof newRoadmap === 'object') {
                    setRoadmap(newRoadmap)
                }
            } else {
                toast.error("Erro ao gerar roadmap")
            }
        } catch (err) {
            console.error("Error generating roadmap:", err)
            toast.error("Erro ao gerar roadmap")
        } finally {
            setGeneratingRoadmap(false)
        }
    }

    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case Status.DRAFT:
                return "bg-gray-500"
            case Status.ACTIVE:
                return "bg-blue-500"
            case Status.FINISHED:
                return "bg-green-500"
            default:
                return "bg-gray-500"
        }
    }

    return (
        <div className="relative w-full max-w-7xl mx-auto my-6 p-6 space-y-6">
            {/* Header with Title, Status, and Actions */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-6 shadow-lg border border-border"
            >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/ideas")}
                                className="hover:bg-accent"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Voltar
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            {idea && (
                                <Badge className={getStatusColor(idea.status)}>
                                    {idea.status}
                                </Badge>
                            )}
                            {idea?.ai_classification && (
                                <Badge variant="outline" className="gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {idea.ai_classification}
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-3xl font-bold text-foreground mb-2 truncate">
                            {idea?.title || "Carregando..."}
                        </h1>

                        {idea?.tags && idea.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {idea.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenEditDialog}
                            className="gap-2"
                        >
                            <Edit3 className="w-4 h-4" />
                            Editar
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleViewRoadmap}
                            className="gap-2"
                        >
                            <Map className="w-4 h-4" />
                            Roadmap
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteIdea}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Editor Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-xl shadow-lg border border-border overflow-hidden h-[70dvh]"
            >
                <SimpleEditor
                    idea_id={idea_id}
                    annotation={ideaContent}
                />
            </motion.div>

            {/* Botão flutuante de chat */}
            <motion.div
                className="fixed bottom-6 right-6 z-50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Button
                    size="lg"
                    className="rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300"
                    onClick={() => setIsChatOpen(true)}
                >
                    <MessageCircle className="w-5 h-5" />
                </Button>
            </motion.div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit3 className="w-5 h-5" />
                            Editar Ideia
                        </DialogTitle>
                        <DialogDescription>
                            Atualize os detalhes da sua ideia
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Nome da ideia"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Status.DRAFT}>Criado</SelectItem>
                                    <SelectItem value={Status.ACTIVE}>Em Progresso</SelectItem>
                                    <SelectItem value={Status.FINISHED}>Terminada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                                    placeholder="Adicionar tag"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddTag}
                                    disabled={!newTag.trim()}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            {editTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {editTags.map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="gap-1">
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} className="gap-2">
                            <Save className="w-4 h-4" />
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Roadmap Dialog */}
            <Dialog open={isRoadmapDialogOpen} onOpenChange={setIsRoadmapDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Map className="w-5 h-5" />
                            Roadmap da Ideia
                        </DialogTitle>
                        <DialogDescription>
                            Visualize ou gere o roadmap de desenvolvimento
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] pr-4">
                        {roadmapLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : roadmap && roadmap.steps ? (
                            <div className="space-y-6 py-4">
                                {roadmap.steps.map((step, stepIdx) => (
                                    <motion.div
                                        key={step.id || stepIdx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: stepIdx * 0.1 }}
                                        className="border border-border rounded-lg p-4 space-y-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                                                {step.step_order}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>

                                        {step.tasks && step.tasks.length > 0 && (
                                            <div className="ml-11 space-y-2">
                                                {step.tasks.map((task, taskIdx) => (
                                                    <div
                                                        key={task.id || taskIdx}
                                                        className="flex items-start gap-2 text-sm"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <p>{task.description}</p>
                                                            {task.suggested_tools && task.suggested_tools.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {task.suggested_tools.map((tool, toolIdx) => (
                                                                        <Badge key={toolIdx} variant="outline" className="text-xs">
                                                                            {tool}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Map className="w-16 h-16 text-muted-foreground" />
                                <p className="text-muted-foreground text-center">
                                    Nenhum roadmap encontrado para esta ideia.
                                    <br />
                                    Gere um novo roadmap para começar!
                                </p>
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRoadmapDialogOpen(false)}
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={handleGenerateRoadmap}
                            disabled={generatingRoadmap}
                            className="gap-2"
                        >
                            {generatingRoadmap ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {roadmap ? "Gerar Novo" : "Gerar Roadmap"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
