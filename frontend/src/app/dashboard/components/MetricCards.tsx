import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useIdeaStore } from "@/store/idea_store";
import { useRoadmapStore } from "@/store/roadmap_store";
import {BrainIcon, LightbulbIcon, RocketIcon, SquareKanbanIcon } from "lucide-react";

type Titles = "Created" | "Progress" | "Finished" | "Roadmap";

interface MetricCardProps {
    title: string;
    value: number;
    subtitle: string;
    Icon: React.ComponentType;
}

const MetricCard = ({ type }: { type: Titles}) =>{
    const created = useIdeaStore((state) => state.ideaCreated) || 0;
    const createdThisMonth = useIdeaStore((state) => state.ideaCreatedThisMonth) || 0;

    const progress = useIdeaStore((state) => state.ideaProgress) || 0;
    const finished = useIdeaStore((state) => state.ideaFinished) || 0;
    const createdRoadmap = useRoadmapStore((state) => state.createdRoadmap) || 0;


    const metricCard: MetricCardProps = {
        Created: {
            title: "Ideias Criadas",
            value: created,
            subtitle: `+${createdThisMonth} este mês`,
            Icon: LightbulbIcon
        },
        Progress: {
            title: "Em Progresso",
            value: progress,
            subtitle: `2 com IA`,
            Icon: RocketIcon
        },
        Finished: {
            title: "Finalizadas",
            value: finished,
            subtitle: `Prontas para execução`,
            Icon: BrainIcon
        },
        Roadmap: {
            title: "Roadmaps",
            value: createdRoadmap,
            subtitle: `Roadmap Criado pelo Sistema`,
            Icon: SquareKanbanIcon
        },

    }[type]
    return (
        <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metricCard.title}
                </CardTitle>
                <div className="text-primary">
                    <metricCard.Icon />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{metricCard.value}</div>
                <p className="text-sm text-muted-foreground">{metricCard.subtitle}</p>
            </CardContent>
        </Card>
    );
}
export default MetricCard;