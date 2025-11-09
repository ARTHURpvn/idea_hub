"use client"

import { useState, useEffect } from "react"
import { JSONContent } from "@tiptap/react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Loader2, Sparkles, Map, ChevronLeft} from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

// SimpleEditor (inline mode when embutido)
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { useIdeaStore } from "@/store/idea_store"
import { getIdeaById, Status } from "@/requests/idea_reqs"
import { getRoadmapById, createRoadmap, Roadmap } from "@/requests/roadmap_reqs"
import EditIdea from "../components/EditIdea"
import AIChat from "@/components/AIChat"

export default function IdeaNotesPage() {
    const router = useRouter()

    // Dialog states
    const [isRoadmapDialogOpen, setIsRoadmapDialogOpen] = useState(false)

    // Roadmap states
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
    const [roadmapLoading, setRoadmapLoading] = useState(false)
    const [generatingRoadmap, setGeneratingRoadmap] = useState(false)

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
    const [isChatOpen, setIsChatOpen] = useState(false)


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

                        <EditIdea idea_id={idea?.id!} />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleViewRoadmap}
                            className="gap-2"
                        >
                            <Map className="w-4 h-4" />
                            Roadmap
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
            <AIChat open={isChatOpen} setOpen={setIsChatOpen}/>
        </div>
    )
}
