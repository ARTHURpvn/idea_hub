"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import WelcomeModal from "@/components/WelcomeModal";

const fallbackData = [
    { name: "Jun", ideias: 2 },
    { name: "Jul", ideias: 4 },
    { name: "Ago", ideias: 3 },
    { name: "Set", ideias: 5 },
    { name: "Out", ideias: 4 },
];

export default function Dashboard() {
    const [showIntro, setShowIntro] = useState(false);
    const mapIdeas = useIdeaStore((state) => state.mapIdeas);
    const mapRoadmaps = useRoadmapStore((state) => state.mapRoadmaps)

    const name = useAuthStore((state) => state.name) || "User Name";
    const months = useIdeaStore((state) => state.months) || [];
    const monthlyCounts = useIdeaStore((state) => state.monthlyCounts) || [];
    const recentIdeas = useIdeaStore((state) => state.recentIdeas) || [];

    // show introductory modal only on first visit
    useEffect(() => {
        try {
            const seen = localStorage.getItem("seen_dashboard_intro");
            if (!seen) setShowIntro(true);
        } catch (e) {
            // localStorage might not be available in some environments
            console.warn("localStorage not available", e);
        }
    }, []);

    const handleCloseIntro = () => {
        try { localStorage.setItem("seen_dashboard_intro", "1"); } catch {}
        setShowIntro(false);
    }

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
                        Bem-vindo de volta, <span className="text-secondary">{name}</span>
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Aqui está um resumo das suas ideias e atividades recentes.
                    </p>
                </div>
                <AddIdea variant={"default"}/>
            </header>

            {/* Cards principais */}
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard type="Created" />
                <MetricCard type="Progress" />
                <MetricCard type="Finished" />
                <MetricCard type="Roadmap" />
            </section>

            {/* Gráfico */}
            <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Progresso de Ideias (Últimos meses)</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Número de ideias criadas mensalmente.
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
                <Card className="border border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Clock className="text-primary" size={16} />
                            Ideias Recentes
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Últimas ideias criadas ou modificadas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 sm:space-y-3">
                            {displayRecent.map((idea, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col xs:flex-row justify-between xs:items-center rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors p-3 gap-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                                            {idea.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            {String(idea.status)}
                                        </p>
                                    </div>
                                    {idea.id ? (
                                        <Button size="sm" variant="outline" asChild className="w-full xs:w-auto flex-shrink-0">
                                            <Link href={`/ideas/${idea.id}`}>
                                                Abrir
                                            </Link>
                                        </Button>
                                    ) : (
                                        // se não houver ID, renderiza botão desabilitado e loga para debug
                                        <Button size="sm" variant="outline" disabled onClick={() => console.warn('dashboard: missing id for recent idea', idea)} className="w-full xs:w-auto">
                                            Sem ID
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Interações IA */}
                <Card className="border border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg">Sugestões da IA</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Insights personalizados com base nas suas ideias.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <Interaction text="💡 'Sua ideia sobre educação tem potencial para IA generativa.'" />
                        <Interaction text="🤖 'Tente explorar parcerias com startups de tecnologia.'" />
                        <Interaction text="🚀 'A IA sugere adicionar um módulo de aprendizado adaptativo.'" />
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
