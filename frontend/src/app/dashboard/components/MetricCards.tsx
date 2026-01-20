import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useIdeaStore } from "@/store/idea_store";
import { useRoadmapStore } from "@/store/roadmap_store";
import { BrainIcon, LightbulbIcon, RocketIcon, SquareKanbanIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

type Titles = "Created" | "Progress" | "Finished" | "Roadmap";

interface MetricCardProps {
    title: string;
    value: number;
    subtitle: string;
    Icon: React.ComponentType<any>;
    gradient: string;
    trend?: number;
}

const MetricCard = ({ type }: { type: Titles }) => {
    const created = useIdeaStore((state) => state.ideaCreated) || 0;
    const createdThisMonth = useIdeaStore((state) => state.ideaCreatedThisMonth) || 0;
    const progress = useIdeaStore((state) => state.ideaProgress) || 0;
    const finished = useIdeaStore((state) => state.ideaFinished) || 0;
    const createdRoadmap = useRoadmapStore((state) => state.createdRoadmap) || 0;
    const responses = useIdeaStore((state) => state.responses) || [];

    // Calcular taxa de conclusão
    const completionRate = created > 0 ? Math.round((finished / created) * 100) : 0;

    // Calcular ideias com IA (que têm classificação)
    const ideasWithAI = responses.filter(r => r.ai_classification && r.ai_classification !== '').length;

    const metricCard: MetricCardProps = {
        Created: {
            title: "Total de Ideias",
            value: created,
            subtitle: createdThisMonth > 0 ? `+${createdThisMonth} este mês` : 'Nenhuma este mês',
            Icon: LightbulbIcon,
            gradient: "from-muted/50 to-background",
            trend: createdThisMonth
        },
        Progress: {
            title: "Em Desenvolvimento",
            value: progress,
            subtitle: ideasWithAI > 0 ? `${ideasWithAI} com suporte IA` : 'Comece a desenvolver',
            Icon: RocketIcon,
            gradient: "from-muted/50 to-background",
            trend: progress
        },
        Finished: {
            title: "Concluídas",
            value: finished,
            subtitle: `${completionRate}% taxa de conclusão`,
            Icon: BrainIcon,
            gradient: "from-muted/50 to-background",
            trend: finished
        },
        Roadmap: {
            title: "Roadmaps Gerados",
            value: createdRoadmap,
            subtitle: createdRoadmap > 0 ? 'Planejamento estruturado' : 'Gere seu primeiro',
            Icon: SquareKanbanIcon,
            gradient: "from-muted/50 to-background",
            trend: createdRoadmap
        },
    }[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={`relative overflow-hidden bg-gradient-to-br ${metricCard.gradient} border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]`}>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />

                <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {metricCard.title}
                    </CardTitle>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                        <metricCard.Icon className="w-5 h-5" />
                    </div>
                </CardHeader>
                <CardContent className="relative">
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-bold text-foreground">
                            {metricCard.value}
                        </div>
                        {metricCard.trend !== undefined && metricCard.trend > 0 && (
                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Ativo
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{metricCard.subtitle}</p>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default MetricCard;