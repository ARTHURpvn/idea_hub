import { create } from "zustand";
import {getIdeas, IdeaResponse, Status} from "../requests/idea";
import {createJSONStorage, persist } from "zustand/middleware";

interface RecentIdea {
    id?: string;
    title: string;
    status: Status;
    ai_classification: string;
    created_at?: string;
}

interface IdeaStore {
    ideaCreated: number,
    ideaProgress: number,
    ideaFinished: number,
    months: string[],
    monthlyCounts: number[],
    responses: Array<Omit<IdeaResponse, "month">>,
    ideaCreatedThisMonth: number,
    recentIdeas: RecentIdea[],
}

interface IdeaStoreActions {
    mapResponse: () => Promise<void>,
}

export const useIdeaStore = create<IdeaStore & IdeaStoreActions>()(
    persist(
        (set) => ({
            ideaCreated: 0,
            ideaProgress: 0,
            ideaFinished: 0,
            months: [],
            monthlyCounts: [],
            responses: [],
            ideaCreatedThisMonth: 0,
            recentIdeas: [],

            mapResponse: async() => {
                const response = await getIdeas()

                if (!response || response.length === 0) {
                    set({
                        responses: [],
                        ideaCreated: 0,
                        ideaProgress: 0,
                        ideaFinished: 0,
                        months: [],
                        monthlyCounts: [],
                        ideaCreatedThisMonth: 0,
                        recentIdeas: [],
                    });
                    return;
                }

                const counts = response.reduce(
                    (acc, item) => {
                        if (item.status === Status.DRAFT) acc.ideaCreated++;
                        else if (item.status === Status.ACTIVE) acc.ideaProgress++;
                        else if (item.status === Status.FINISHED) acc.ideaFinished++;
                        return acc;
                    },
                    { ideaCreated: 0, ideaProgress: 0, ideaFinished: 0 }
                );

                const cleanedResponses: Array<Omit<IdeaResponse, "month">> = response.map(({ month, ...rest }) => ({ ...rest }));

                const uniqueMonthNums: number[] = response
                    .map(r => r.month)
                    .filter((m): m is number => typeof m === 'number')
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .sort((a, b) => a - b);

                const countsPerMonth: Record<number, number> = {};
                response.forEach(r => {
                    if (typeof r.month === 'number') {
                        countsPerMonth[r.month] = (countsPerMonth[r.month] || 0) + 1;
                    }
                });

                const monthShortNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

                const monthLabels = uniqueMonthNums.map(n => monthShortNames[n - 1] ?? String(n));
                const monthlyCounts = uniqueMonthNums.map(n => countsPerMonth[n] || 0);

                const currentMonthNumber = new Date().getMonth() + 1;
                const ideaCreatedThisMonth = response.filter(r => r.month === currentMonthNumber).length;

                const recent = [...response]
                    .filter(r => !!r.created_at)
                    .sort((a, b) => (new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()))
                    .slice(0, 3)
                    .map(r => ({ id: r.id, title: r.title, status: r.status, ai_classification: r.ai_classification, created_at: r.created_at }));

                console.log('monthLabels:', monthLabels, 'ideaCreatedThisMonth:', ideaCreatedThisMonth, 'recent:', recent)

                set({
                    responses: cleanedResponses,
                    ideaCreated: counts.ideaCreated,
                    ideaProgress: counts.ideaProgress,
                    ideaFinished: counts.ideaFinished,
                    months: monthLabels,
                    monthlyCounts,
                    ideaCreatedThisMonth,
                    recentIdeas: recent,
                });
             }

         }),
        {
            name: "idea-storage",
            storage: createJSONStorage(() =>
                typeof window !== "undefined" && typeof window.localStorage !== "undefined"
                    ? window.localStorage
                    : {
                        getItem: (_key: string) => null,
                        setItem: (_key: string, _value: string) => {},
                        removeItem: (_key: string) => {},
                    }
            ),
        }
    )
)