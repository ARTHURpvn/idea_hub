"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    LabelList,
} from "recharts";
import {
    Clock,
    Sparkles,
    Target,
    Zap,
    TrendingUp,
    Calendar,
    Award,
} from "lucide-react";
import { useAuthStore } from "@/store/auth_store";
import { useIdeaStore } from "@/store/idea_store";
import { useEffect, useState } from "react";
import { Status } from "@/requests/idea_reqs";
import { useRoadmapStore } from "@/store/roadmap_store";
import MetricCard from "./components/MetricCards";
import AddIdea from "../ideas/components/AddIdea";
import Link from "next/link";
import { createChatReq, sendMessageReq } from "@/requests/chat_reqs";

const fallbackData = [
];

export default function Dashboard() {
    const mapIdeas = useIdeaStore((state) => state.mapIdeas);
    const mapRoadmaps = useRoadmapStore((state) => state.mapRoadmaps)

    const name = useAuthStore((state) => state.name) || "User Name";
    const firstLogin = useAuthStore((state) => state.firstLogin) || false;
    const months = useIdeaStore((state) => state.months) || [];
    const monthlyCounts = useIdeaStore((state) => state.monthlyCounts) || [];
    const recentIdeas = useIdeaStore((state) => state.recentIdeas) || [];
    const ideaCreated = useIdeaStore((state) => state.ideaCreated) || 0;
    const ideaProgress = useIdeaStore((state) => state.ideaProgress) || 0;
    const ideaFinished = useIdeaStore((state) => state.ideaFinished) || 0;
    const responses = useIdeaStore((state) => state.responses) || [];

    // Calcular estatísticas úteis
    const totalIdeas = ideaCreated;
    const completionRate = totalIdeas > 0 ? Math.round((ideaFinished / totalIdeas) * 100) : 0;
    const activeRate = totalIdeas > 0 ? Math.round((ideaProgress / totalIdeas) * 100) : 0;
    const productivity = monthlyCounts.length > 0
        ? Math.round(monthlyCounts.reduce((a, b) => a + b, 0) / monthlyCounts.length)
        : 0;

    // Insights inteligentes baseados nos dados
    const generateInsights = () => {
        const insights = [];

        if (completionRate >= 50) {
            insights.push({
                icon: "🎯",
                text: `Excelente! Você já concluiu ${completionRate}% das suas ideias.`
            });
        } else if (completionRate > 0) {
            insights.push({
                icon: "💪",
                text: `Continue focado! ${completionRate}% de conclusão, você pode mais!`
            });
        }

        if (ideaProgress > 0) {
            insights.push({
                icon: "🚀",
                text: `Você tem ${ideaProgress} ideia${ideaProgress > 1 ? 's' : ''} em desenvolvimento ativo.`
            });
        }

        if (productivity > 2) {
            insights.push({
                icon: "⚡",
                text: `Produtividade alta! Média de ${productivity} ideias por mês.`
            });
        } else if (totalIdeas > 0) {
            insights.push({
                icon: "💡",
                text: `Que tal criar mais ideias? Sua média é de ${productivity} por mês.`
            });
        }

        if (responses.filter(r => r.ai_classification).length > 0) {
            insights.push({
                icon: "🤖",
                text: `A IA já classificou ${responses.filter(r => r.ai_classification).length} das suas ideias!`
            });
        }

        if (insights.length === 0) {
            insights.push({
                icon: "🌟",
                text: "Comece criando sua primeira ideia e veja a mágica acontecer!"
            });
        }

        return insights;
    };

    const insights = generateInsights();


    useEffect(() => {
        mapIdeas && typeof mapIdeas === 'function' && mapIdeas().catch((err: any) => console.error("Failed to map responses:", err));
    }, [mapIdeas]);
    useEffect(() => {
        mapRoadmaps && typeof mapRoadmaps === 'function' && mapRoadmaps().catch((err: any) => console.error("Failed to map responses:", err));
    }, [mapRoadmaps]);

    // Seed an initial chat/message for the user's first idea (only once)
    useEffect(() => {
        try {
            const seeded = localStorage.getItem("seeded_initial_chat");
            if (seeded) return;
            if (!recentIdeas || !recentIdeas.length) return;

            const first = recentIdeas[0];
            if (!first?.id) return;

            // Use existing helpers: create a chat for the idea and send an initial message
            (async () => {
                try {
                    const ideaId = String(first.id);
                    const created = await createChatReq(ideaId);
                    if (!created) return;
                    const chatId = created.chat_id;
                    const initial = `Olá! Este é o chat inicial para a ideia "${first.title}". Pergunte algo sobre a ideia ou peça uma sugestão.`;
                    const sent = await sendMessageReq({ chat_id: chatId, message: initial });
                    if (sent) {
                        try { localStorage.setItem('seeded_initial_chat', '1'); } catch (e) {}
                    }
                } catch (err) {
                    console.warn('failed to seed initial chat', err);
                }
            })();
        } catch (e) {
            console.warn('seed initial chat error', e);
        }
    }, [recentIdeas]);

    // prepare chart data aligning months -> monthlyCounts
    const chartData = months.length && monthlyCounts.length
        ? months.map((m, idx) => ({ name: m, ideias: monthlyCounts[idx] ?? 0 }))
        : fallbackData;

    // format recent ideas for display (fallback to a small mock when empty)
    const displayRecent = recentIdeas.length ? recentIdeas : [
        { title: "App de IA Criativa", status: Status.ACTIVE, ai_classification: "", created_at: '2025-10-20' },
        { title: "Plataforma de Mentoria", status: Status.FINISHED, ai_classification: "", created_at: '2025-10-10' },
        { title: "Hub de Freelancers", status: Status.DRAFT, ai_classification: "", created_at: '2025-10-02' },
    ];

    const fmtDate = (d?: string) => {
        if (!d) return "-";
        try {
            const dt = new Date(d);
            return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return d }
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 md:space-y-10 max-w-7xl mx-auto">

            {/* Cabeçalho */}
            <header className="flex flex-col gap-4 sm:gap-6 lg:flex-row justify-between items-start lg:items-start">
                <div className={"space-y-1"}>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        Bem-vindo, <span className="text-secondary">{name}</span>
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Veja suas estatísticas e acompanhe o progresso das suas ideias.
                    </p>
                </div>
                <div data-add-idea>
                    <AddIdea variant={"default"}/>
                </div>
            </header>

            {/* Cards principais */}
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard type="Created" />
                <MetricCard type="Progress" />
                <MetricCard type="Finished" />
                <MetricCard type="Roadmap" />
            </section>

            {/* Quick Stats & Actions */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Progress Ring - Produtividade */}
                <Card className="border border-border shadow-sm bg-gradient-to-br from-primary/5 to-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            Taxa de Conclusão
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Seu progresso geral
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-muted/20"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionRate / 100)}`}
                                    className="text-primary transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                                <span className="text-xs text-muted-foreground">Concluídas</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                            {ideaFinished} de {totalIdeas} ideias finalizadas
                        </p>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border border-border shadow-sm lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            Ações Rápidas
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Acesse rapidamente suas principais ações
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/50 transition-all"
                            asChild
                        >
                            <Link href="/ideas">
                                <Sparkles className="w-6 h-6 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold text-sm">Ver Todas</div>
                                    <div className="text-xs text-muted-foreground">{totalIdeas} ideias</div>
                                </div>
                            </Link>
                        </Button>

                        <div onClick={() => document.querySelector<HTMLElement>('[data-add-idea]')?.click()}>
                            <Button
                                variant="outline"
                                className="w-full h-full flex-col gap-2 p-4 hover:bg-green-500/5 hover:border-green-500/50 transition-all"
                            >
                                <Target className="w-6 h-6 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold text-sm">Nova Ideia</div>
                                    <div className="text-xs text-muted-foreground">Criar agora</div>
                                </div>
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/50 transition-all"
                            asChild
                        >
                            <Link href="/ideas">
                                <TrendingUp className="w-6 h-6 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold text-sm">Em Progresso</div>
                                    <div className="text-xs text-muted-foreground">{ideaProgress} ativas</div>
                                </div>
                            </Link>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 hover:bg-primary/5 hover:border-primary/50 transition-all"
                            asChild
                        >
                            <Link href="/ideas">
                                <Award className="w-6 h-6 text-primary" />
                                <div className="text-center">
                                    <div className="font-semibold text-sm">Concluídas</div>
                                    <div className="text-xs text-muted-foreground">{ideaFinished} finalizadas</div>
                                </div>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico */}
            <Card className="border border-border shadow-sm bg-gradient-to-br from-background to-muted/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Evolução de Ideias
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Acompanhe sua produtividade ao longo dos meses
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="h-[180px] sm:h-[220px] md:h-[260px] -ml-4 sm:ml-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 18, right: 4, left: -20, bottom: 6 }}>
                                <defs>
                                    <linearGradient id="colorIdeias" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    </linearGradient>
                                    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.08" />
                                    </filter>
                                </defs>

                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="text-xs text-muted-foreground"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    className="text-xs text-muted-foreground"
                                    allowDecimals={false}
                                />

                                {/* Tooltip customizado com estilo mais suave */}
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                    wrapperStyle={{ outline: 'none', fontSize: 13 }}
                                />

                                <Bar
                                    dataKey="ideias"
                                    fill="url(#colorIdeias)"
                                    radius={[10, 10, 6, 6]}
                                    barSize={32}
                                    animationDuration={900}
                                    animationEasing="ease-out"
                                    isAnimationActive={true}
                                >
                                    <LabelList dataKey="ideias" position="top" className="text-xs text-foreground" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Seções secundárias */}
            <section className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                {/* Ideias Recentes */}
                <Card className="border border-border shadow-sm bg-gradient-to-br from-muted/30 to-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Clock className="text-primary" size={16} />
                            Atividade Recente
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Suas últimas {displayRecent.length} ideias
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 sm:space-y-3">
                            {displayRecent.map((idea, index) => {
                                const getStatusColor = (status: string) => {
                                    switch (status) {
                                        case 'ACTIVE':
                                            return 'bg-primary/10 text-primary border-primary/20';
                                        case 'FINISHED':
                                            return 'bg-muted text-muted-foreground border-border';
                                        case 'DRAFT':
                                            return 'bg-muted/50 text-muted-foreground border-border';
                                        default:
                                            return 'bg-muted text-muted-foreground';
                                    }
                                };

                                const getStatusLabel = (status: string) => {
                                    switch (status) {
                                        case 'ACTIVE':
                                            return 'Em Progresso';
                                        case 'FINISHED':
                                            return 'Concluída';
                                        case 'DRAFT':
                                            return 'Rascunho';
                                        default:
                                            return status;
                                    }
                                };

                                return (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between rounded-lg border border-border bg-card hover:bg-muted/50 transition-all duration-200 p-3 gap-3 hover:shadow-sm"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                                                    {idea.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(String(idea.status))}`}>
                                                    {getStatusLabel(String(idea.status))}
                                                </span>
                                                {idea.ai_classification && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" />
                                                        {idea.ai_classification}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {idea.id ? (
                                            <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                                                <Link href={`/ideas/${idea.id}`}>
                                                    Abrir
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" disabled className="flex-shrink-0">
                                                Sem ID
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Insights Inteligentes */}
                <Card className="border border-border shadow-sm bg-gradient-to-br from-muted/50 to-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Insights Personalizados
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Análise baseada nas suas ideias
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {insights.map((insight, index) => (
                            <div
                                key={index}
                                className="p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02]"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                                    <p className="text-sm flex-1">{insight.text}</p>
                                </div>
                            </div>
                        ))}

                        {productivity > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <Calendar className="w-4 h-4" />
                                    Produtividade Mensal
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-foreground">{productivity}</span>
                                    <span className="text-sm text-muted-foreground">ideias/mês</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}


function Interaction({ text }: { text: string }) {
    return (
        <div className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition">
            {text}
        </div>
    );
}


function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;

    return (
        <div className="bg-card border border-border shadow-md p-3 rounded-md text-sm">
            <div className="font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground">{point.ideias} ideias</div>
        </div>
    );
}
