"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {LightbulbIcon, Search, ExternalLink } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { useIdeaStore } from "@/store/idea_store"
import EditIdea from "./components/EditIdea";
import AddIdea from "./components/AddIdea";

export default function IdeiasPage() {
    const [search, setSearch] = useState("")
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const ideas = useIdeaStore((state) => state.responses)
    const recentIdeas = useIdeaStore((state) => state.recentIdeas) || []

    const filteredIdeas = ideas.filter((idea) => {
        const matchesTitle = idea.title.toLowerCase().includes(search.toLowerCase())
        if (activeTag) {
            return matchesTitle && Array.isArray(idea.tags) && idea.tags.includes(activeTag)
        }
        return matchesTitle
    })

    const clearTagFilter = () => setActiveTag(null)

    const formattedDate = (date?: string) => {
        if (!date) return "-"
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
        };
        return new Date(date).toLocaleDateString("pt-BR", options);
    }


    const len = filteredIdeas.length
    return (
        <div className="flex flex-col w-full p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="sticky top-4 bg-background/80 backdrop-blur-md z-10 p-4 rounded-xl border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">Explorar Ideias</h1>
                        <p className="text-muted-foreground text-sm">
                            Descubra, inspire-se e colabore em novas ideias.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-120 mr-4">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar ideia..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <AddIdea variant={"default"}/>
                    </div>
                </div>
            </div>

            {/* Active tag filter */}
            {activeTag && (
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">Filtrando por tag:</div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTag(activeTag)} className="px-2">
                        #{activeTag}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearTagFilter} className="text-sm">Limpar</Button>
                </div>
            )}

            {/* Result count */}
            <div className="text-sm text-muted-foreground">{filteredIdeas.length} ideias encontradas</div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main list */}
                <div className="col-span-2">
                    <div className={`${len === 0 ? "flex" : "grid"} justify-center sm:grid-cols-2 lg:grid-cols-2 gap-5`}>
                        {filteredIdeas.map((idea) => (
                            <Card
                                key={idea.id}
                                className="transition-all transform hover:scale-[1.02] duration-200 hover:shadow-2xl cursor-pointer overflow-hidden"
                            >
                                <CardHeader className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">{idea.title}</h2>
                                        <p className="text-xs text-muted-foreground">{idea.ai_classification ? `Classificação: ${idea.ai_classification}` : 'Classificação: —'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`/ideas/${idea.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            title="Abrir"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex flex-col gap-3">
                                    <div className="flex flex-wrap gap-2">
                                        {idea.tags && idea.tags.length > 0 ? (
                                            idea.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="cursor-pointer hover:opacity-90 transition" onClick={(e) => { e.stopPropagation(); setActiveTag(tag); }}>{tag}</Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline">Sem tags</Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div>Criado: {formattedDate(idea.created_at)}</div>
                                        <div className="px-2 py-1 rounded-md bg-muted/10 text-muted-foreground">{idea.status}</div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                         <EditIdea idea_id={idea.id!} triggerLabel={"Editar"} />
                                         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); window.location.href = `/ideas/${idea.id}`; }}>
                                             Ver
                                         </Button>
                                     </div>
                                </CardFooter>
                            </Card>
                        ))}

                        {filteredIdeas.length === 0 && (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <LightbulbIcon />
                                    </EmptyMedia>
                                    <EmptyTitle>Sem Ideias</EmptyTitle>
                                    <EmptyDescription>Nenhuma Idea foi encontrada</EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <AddIdea variant={"default"} />
                                </EmptyContent>
                            </Empty>
                        )}
                    </div>
                </div>

                {/* Right column: Recent ideas + quick stats */}
                <aside className="col-span-1 space-y-4">
                    {/* Sidebar visually distinct: soft surface, compact list, quick actions */}
                    <div className="rounded-xl border bg-muted/5 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Recentes</h3>
                                <p className="text-sm text-muted-foreground">Últimas 3 ideias</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {recentIdeas.length > 0 ? recentIdeas.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/10 transition">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{(r.title || "?").slice(0,1).toUpperCase()}</div>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{r.title}</div>
                                        <div className="text-xs text-muted-foreground">{formattedDate(r.created_at)}</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-muted-foreground">Nenhuma recente</div>
                            )}
                        </div>

                        <div className="pt-2 border-t pt-6 space-y-4">
                            <h4 className="text-sm font-semibold">Ações rápidas</h4>
                            <div className="mt-2 flex flex-col gap-2">
                                <AddIdea variant={"secondary"} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border p-4">
                        <h3 className="text-lg font-semibold">Dicas</h3>
                        <ul className="mt-2 text-sm text-muted-foreground space-y-2">
                            <li>- Use tags para organizar suas ideias</li>
                            <li>- Filtre pelo título para encontrar rapidamente</li>
                            <li>- Use o painel à esquerda para navegar</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    )
}
