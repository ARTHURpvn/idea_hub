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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

    // Default welcome content for new ideas
    const defaultContent: JSONContent = {
        type: "doc",
        content: [
            {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: "Bem-vindo à sua nova ideia! 💡" }]
            },
            {
                type: "paragraph",
                content: [
                    { type: "text", text: "Este é o seu espaço para desenvolver e organizar suas ideias de forma estruturada." }
                ]
            },
            {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🤖 Assistente de IA Integrado" }]
            },
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Temos uma IA especializada para ajudá-lo a desenvolver sua ideia! Ela pode:"
                    }
                ]
            },
            {
                type: "bulletList",
                content: [
                    {
                        type: "listItem",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: "Sugerir melhorias e funcionalidades" }]
                        }]
                    },
                    {
                        type: "listItem",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: "Responder perguntas sobre implementação" }]
                        }]
                    },
                    {
                        type: "listItem",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: "Ajudar a estruturar seu projeto" }]
                        }]
                    },
                    {
                        type: "listItem",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: "Dar insights sobre tecnologias e melhores práticas" }]
                        }]
                    }
                ]
            },
            {
                type: "heading",
                attrs: { level: 3 },
                content: [{ type: "text", text: "💬 Como acessar a IA?" }]
            },
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "É simples! Clique no "
                    },
                    {
                        type: "text",
                        marks: [{ type: "bold" }],
                        text: "botão de chat flutuante"
                    },
                    {
                        type: "text",
                        text: " no canto inferior direito da tela (ícone de mensagem 💬). Uma janela lateral será aberta e você poderá conversar diretamente com a IA sobre sua ideia!"
                    }
                ]
            },
            {
                type: "horizontalRule"
            },
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        marks: [{ type: "italic" }],
                        text: "Dica: Você pode editar este texto e começar a escrever suas ideias. O conteúdo é salvo automaticamente! ✨"
                    }
                ]
            }
        ]
    }

    // attempt to find idea first in recentIdeas (fast), then in full responses
    const recent = useIdeaStore((state) => state.recentIdeas) || []
    const responses = useIdeaStore((state) => state.responses) || []
    const mapIdeas = useIdeaStore((state) => state.mapIdeas)

    // State to hold idea data when not in store
    const [ideaData, setIdeaData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // comparison normalized to string to avoid number vs string mismatch
    const storeIdea = recent.find((i) => String(i.id) === idea_id) || responses.find((r) => String(r.id) === idea_id)
    const idea = ideaData || storeIdea

    // Load idea content on mount or when idea_id changes
    useEffect(() => {
        let mounted = true
        const load = async () => {
            if (!idea_id) {
                setLoading(false)
                return
            }

            // Try to get from store first
            const storeIdea = recent.find((i) => String(i.id) === idea_id) || responses.find((r) => String(r.id) === idea_id)

            if (storeIdea) {
                if (mounted) {
                    console.log('[page] setting ideaContent from store:', (storeIdea as any).raw_content);
                    const content = (storeIdea as any).raw_content
                    // Use default content if no content exists or if it's empty
                    if (!content || content === "" || (typeof content === 'object' && (!content.content || content.content.length === 0))) {
                        setIdeaContent(defaultContent)
                    } else {
                        setIdeaContent(content as string | JSONContent)
                    }
                    setLoading(false)
                }
                return
            }

            // Otherwise fetch from server
            try {
                const server = await getIdeaById(idea_id)
                if (mounted && server) {
                    console.log('[page] setting ideaContent from server:', server.raw_content);
                    const content = server.raw_content
                    // Use default content if no content exists or if it's empty
                    if (!content || content === "" || (typeof content === 'object' && (!content.content || content.content.length === 0))) {
                        setIdeaContent(defaultContent)
                    } else {
                        setIdeaContent(content ?? "")
                    }
                    setIdeaData(server)
                    // Update store with all ideas
                    await mapIdeas()
                }
            } catch (err) {
                console.warn('failed to fetch idea by id', err)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
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
    const [showChatPulse, setShowChatPulse] = useState(true)

    // Remove pulse after first interaction or after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowChatPulse(false)
        }, 10000) // Remove pulse after 10 seconds

        return () => clearTimeout(timer)
    }, [])

    const handleChatOpen = () => {
        setShowChatPulse(false)
        setIsChatOpen(true)
    }

    // Show loading state
    if (loading) {
        return (
            <div className="relative w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Carregando ideia...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4" style={{ height: 'calc(100vh - 60px)' }}>
            {/* Header with Title, Status, and Actions */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-4 sm:p-6 shadow-xl border border-border/50 flex-shrink-0"
            >
                <div className="flex flex-col gap-4">
                    {/* Navigation and Status Row */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/ideas")}
                            className="hover:bg-accent gap-1.5"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden xs:inline">Voltar</span>
                        </Button>
                        <Separator orientation="vertical" className="h-6 hidden xs:block" />
                        {idea && (
                            <Badge className={`${getStatusColor(idea.status)} text-white text-xs`}>
                                {idea.status}
                            </Badge>
                        )}
                        {idea?.ai_classification && (
                            <Badge variant="outline" className="gap-1.5 text-xs border-primary/30 bg-primary/5">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span>{idea.ai_classification}</span>
                            </Badge>
                        )}
                    </div>

                    {/* Title and Actions Row */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 w-full">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 break-words leading-tight">
                                {idea?.title || "Carregando..."}
                            </h1>

                            {idea?.tags && idea.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {idea.tags.map((tag: string, idx: number) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs hover:bg-primary/10 hover:text-primary transition cursor-default"
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                            {idea && <EditIdea idea_id={idea.id!} />}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Editor Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl shadow-xl border border-border/50 flex-1 overflow-hidden"
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                <SimpleEditor
                    idea_id={idea_id}
                    annotation={ideaContent}
                />
            </motion.div>

            {/* Botão flutuante de chat */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="relative">
                                {showChatPulse && (
                                    <>
                                        <motion.div
                                            className="absolute inset-0 rounded-full bg-primary"
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.6, 0, 0.6],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        />
                                        <motion.div
                                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                                            animate={{
                                                scale: [1, 1.1, 1],
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                            }}
                                        >
                                            !
                                        </motion.div>
                                    </>
                                )}
                                <Button
                                    size="lg"
                                    className="relative size-14 sm:size-16 rounded-full shadow-2xl hover:shadow-primary/50 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
                                    onClick={handleChatOpen}
                                >
                                    <Sparkles className="size-6 sm:size-7" />
                                </Button>
                            </div>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-sm sm:text-base bg-gradient-to-r from-primary/90 to-primary/80 border-primary/50">
                        <p className="flex items-center gap-2 font-medium">
                            <Sparkles className="w-4 h-4" />
                            Converse com a IA sobre sua ideia
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Roadmap Dialog */}
            <Dialog open={isRoadmapDialogOpen} onOpenChange={setIsRoadmapDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[75vh]">
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
            <AIChat open={isChatOpen} setOpen={setIsChatOpen} idea_id={idea_id}/>

        </div>
    )
}
