"use client"

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth_store";
import {BookmarkCheckIcon, LightbulbIcon, PenLineIcon, SquareKanbanIcon } from "lucide-react";

export default function DashboardPage() {
    const ideias = [
        { nome: "App de IA Criativa", status: "em andamento", data: "2025-10-20" },
        { nome: "Plataforma de Freelancers", status: "concluída", data: "2025-09-10" },
    ];
    const cards = [
        { title: "Ideias Criadas", value: 7, Icon: <LightbulbIcon /> },
        { title: "Em Andamento", value: 3, Icon: <PenLineIcon /> },
        { title: "Concluídas", value: 2, Icon: <BookmarkCheckIcon /> },
        { title: "Roadmaps", value: 4, Icon: <SquareKanbanIcon /> },
    ]

    const name = useAuthStore.getState().name || "User Name";
    return (
        <div className="box-border max-w-full py-12 px-6 md:px-12 overflow-x-hidden">
            <title> IdeaHub | Dashboard </title>
            <div className="max-w-7xl mx-auto w-full min-w-0">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Boa Tarde, <span className={"text-primary"}>{name}!</span></h1>
                        <p className="text-muted-foreground">Pronto para criar melhorar suas Ideias?</p>
                    </div>
                    <Button>
                        + Nova Ideia
                    </Button>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((item, index) => (
                        <div key={index} className="flex flex-row items-center gap-8 bg-card py-5 px-8 rounded-2xl shadow text-center min-w-0">
                            <div className={"size-10 bg-primary/20 text-primary rounded-md flex items-center justify-center"}>
                                {item.Icon}
                            </div>
                            <div className={"flex flex-col justify-center gap-1"}>
                                <h2 className="text-3xl font-semibold text-left">{item.value}</h2>
                                <p className="text-sm text-muted-foreground">{item.title}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ideias Recentes */}
                <div className={"mt-12"}>
                    <h2 className="text-lg font-bold mb-3 flex gap-2 items-center"><LightbulbIcon  className={"text-secondary"}/> Ideias Recentes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ideias.map((idea) => (
                            <div key={idea.nome} className="bg-muted p-4 rounded-2xl min-w-0">
                                <h3 className="font-semibold">{idea.nome}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {idea.status} • {idea.data}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sugestões da IA */}
                <div>
                    <h2 className="text-lg font-bold mb-3">💬 Sugestões da IA</h2>
                    <p className="italic text-muted-foreground">
                        “Suas ideias têm foco em tecnologia. Que tal explorar IA aplicada à educação?”
                    </p>
                </div>
            </div>
        </div>
    );
}
