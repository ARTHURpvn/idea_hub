"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {LightbulbIcon, Search, ExternalLink, Calendar, Tag, Sparkles, TrendingUp } from "lucide-react"
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
import { motion } from "framer-motion";

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

    // Get all unique tags from all ideas
    const allTags = Array.from(new Set(ideas.flatMap(idea => idea.tags || [])))

    return (
        <div className="flex flex-col w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
            {/* Top Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-2 sm:top-4 z-100 bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-xl z-10 p-4 sm:p-6 rounded-2xl border shadow-lg"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Suas Ideias
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base mt-1">
                            Gerencie e desenvolva suas ideias em um só lugar
                        </p>
                    </div>

                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full xs:w-64 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 rounded-lg border-muted-foreground/20 focus:border-primary transition-colors"
                            />
                        </div>
                        <AddIdea variant={"default"}/>
                    </div>
                </div>

                {/* Active tag filter */}
                {activeTag && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t"
                    >
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Filtrando por:</span>
                        <Badge variant="secondary" className="gap-1">
                            {activeTag}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearTagFilter}
                            className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive"
                        >
                            Limpar filtro
                        </Button>
                    </motion.div>
                )}
            </motion.div>

            {/* Stats Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
            >
                <Card className="p-4 border-l-4 border-l-primary">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Total de Ideias</p>
                            <p className="text-2xl sm:text-3xl font-bold">{ideas.length}</p>
                        </div>
                        <LightbulbIcon className="w-8 h-8 text-primary/20" />
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Encontradas</p>
                            <p className="text-2xl sm:text-3xl font-bold">{filteredIdeas.length}</p>
                        </div>
                        <Search className="w-8 h-8 text-blue-500/20" />
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-purple-500 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Tags Únicas</p>
                            <p className="text-2xl sm:text-3xl font-bold">{allTags.length}</p>
                        </div>
                        <Tag className="w-8 h-8 text-purple-500/20" />
                    </div>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main list */}
                <div className="col-span-1 lg:col-span-2">
                    <div className={`${len === 0 ? "flex" : "grid"} justify-center grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5`}>
                        {filteredIdeas.map((idea, index) => (
                            <motion.div
                                key={idea.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className="group relative transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden border-muted hover:border-primary/50 h-full flex flex-col">
                                    {/* Gradient overlay on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                    <CardHeader className="flex flex-row items-start justify-between gap-3 sm:p-5 relative z-10">
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-base sm:text-lg font-bold truncate group-hover:text-primary transition-colors">
                                                {idea.title}
                                            </h2>
                                            {idea.ai_classification && (
                                                <div className="flex items-center gap-1.5 ">
                                                    <Sparkles className="w-3 h-3 text-primary" />
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {idea.ai_classification}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `/ideas/${idea.id}`;
                                                }}
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex flex-col gap-3 p-4 sm:p-5 pt-0 flex-1 relative z-10">
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {idea.tags && idea.tags.length > 0 ? (
                                                idea.tags.slice(0, 3).map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="cursor-pointer hover:bg-primary/10 hover:text-primary transition text-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTag(tag);
                                                        }}
                                                    >
                                                        #{tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                    Sem tags
                                                </Badge>
                                            )}
                                            {idea.tags && idea.tags.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{idea.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>

                                        <Separator className="my-2" />

                                        {/* Info row */}
                                        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formattedDate(idea.created_at)}</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="w-fit text-xs"
                                            >
                                                {idea.status}
                                            </Badge>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex items-center justify-between gap-2 p-4 sm:p-5 pt-0 relative z-10 mt-auto border-t">
                                         <EditIdea idea_id={idea.id!} triggerLabel={"Editar"} />
                                         <Button
                                            variant="default"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/ideas/${idea.id}`;
                                            }}
                                            className="gap-1.5"
                                         >
                                             Abrir
                                             <ExternalLink className="w-3 h-3" />
                                         </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}

                        {filteredIdeas.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="col-span-full"
                            >
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <LightbulbIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>Nenhuma ideia encontrada</EmptyTitle>
                                        <EmptyDescription>
                                            {search || activeTag
                                                ? "Tente ajustar seus filtros ou busca"
                                                : "Crie sua primeira ideia para começar"}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <AddIdea variant={"default"} />
                                    </EmptyContent>
                                </Empty>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Right column: Recent ideas + quick stats */}
                <motion.aside
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-1 space-y-4"
                >
                    {/* Recent Ideas Card */}
                    <Card className="border-muted">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold">Ideias Recentes</h3>
                                    <p className="text-xs text-muted-foreground">Últimas 3 ideias criadas</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pb-4">
                            {recentIdeas.length > 0 ? recentIdeas.map((r) => (
                                <motion.div
                                    key={r.id}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition cursor-pointer border border-transparent hover:border-primary/20"
                                    onClick={() => window.location.href = `/ideas/${r.id}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                        {(r.title || "?").slice(0,1).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{r.title}</div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            {formattedDate(r.created_at)}
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="text-sm text-center text-muted-foreground py-4">
                                    Nenhuma ideia recente
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tags populares */}
                    {allTags.length > 0 && (
                        <Card className="border-muted">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <Tag className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold">Tags Disponíveis</h3>
                                        <p className="text-xs text-muted-foreground">Clique para filtrar</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="flex flex-wrap gap-2">
                                    {allTags.slice(0, 10).map((tag) => {
                                        const count = ideas.filter(idea => idea.tags?.includes(tag)).length
                                        return (
                                            <Badge
                                                key={tag}
                                                variant={activeTag === tag ? "default" : "secondary"}
                                                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition gap-1"
                                                onClick={() => setActiveTag(tag)}
                                            >
                                                #{tag}
                                                <span className="text-xs opacity-70">({count})</span>
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Actions */}
                    <Card className="border-muted bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <h3 className="text-base font-semibold">Ações Rápidas</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pb-4">
                            <AddIdea variant={"secondary"} />
                            {activeTag && (
                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={clearTagFilter}
                                >
                                    <Tag className="w-4 h-4" />
                                    Limpar Filtros
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tips Card */}
                    <Card className="border-muted border-dashed">
                        <CardHeader className="pb-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">💡 Dicas</h3>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <ul className="text-xs text-muted-foreground space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>Use tags para organizar suas ideias por tema ou categoria</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>Clique em uma ideia para ver os detalhes e conversar com a IA</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>A busca encontra ideias pelo título automaticamente</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </motion.aside>
            </div>
        </div>
    )
}
