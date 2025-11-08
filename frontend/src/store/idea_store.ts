import { create } from "zustand";
import {createIdea, getIdeas, IdeaDTO, IdeaResponse, Status, updateIdea as apiUpdateIdea, parseStatus, deleteIdea as apiDeleteIdea} from "../requests/idea_reqs";
import {createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";
import { JSONContent } from "@tiptap/react";

interface RecentIdea {
    id?: string;
    title: string;
    status: Status;
    ai_classification: string;
    created_at?: string;
    raw_content?: JSONContent;
    tags?: string[];
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
    mapIdeas: () => Promise<void>,
    createIdea: (title: string, tags: string[]) => Promise<boolean>,
    updateIdea: (idea: Partial<IdeaDTO>) => Promise<boolean>,
    deleteIdea: (id?: string) => Promise<boolean>,
}

export const useIdeaStore = create<IdeaStore & IdeaStoreActions>()(
    persist(
        (set, get) => ({
            ideaCreated: 0,
            ideaProgress: 0,
            ideaFinished: 0,
            months: [],
            monthlyCounts: [],
            responses: [],
            ideaCreatedThisMonth: 0,
            recentIdeas: [],

            mapIdeas: async() => {
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

                const cleanedResponses: Array<Omit<IdeaResponse, "month">> = response.map(({ month, ...rest }) => ({ ...rest, id: rest.id !== undefined && rest.id !== null ? String(rest.id) : undefined }));

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
                    .map(r => {
                        const idStr = r.id !== undefined && r.id !== null ? String(r.id) : undefined;
                        if (!idStr) {
                            console.warn('mapIdeas: recent idea missing id on server response', r);
                        }
                        return {
                            id: idStr,
                            title: r.title,
                            status: r.status,
                            ai_classification: r.ai_classification,
                            created_at: r.created_at,
                            raw_content: (r as any).raw_content ?? undefined,
                        }
                    });

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
             },

            createIdea: async(title: string, tags: string[]) => {
                const idea = {title, tags}
                try {
                    const response = await createIdea(idea)
                    if(response) {
                        toast.success("Ideia criada com sucesso")
                        // refresh mapped ideas in store so UI updates immediately
                        try {
                            const state = get()
                            if (state && typeof state.mapIdeas === 'function') {
                                await state.mapIdeas()
                            }
                        } catch (err) {
                            console.warn('mapIdeas failed after createIdea', err)
                        }
                        return true
                    }
                    else {
                        toast.error("Erro ao criar ideia")
                        return false
                    }
                }
                catch (error) {
                    toast.error("Erro ao criar ideia")
                    console.log(error)
                    return false
                }
            },

            updateIdea: async(idea: Partial<IdeaDTO>) => {
                console.log('updateIdea called with:', idea)
                try {
                    let res = await apiUpdateIdea(idea)
                    console.log('updateIdea response:', res)
                    if (!res && idea && typeof (idea as any).status === 'number') {
                        const num = (idea as any).status
                        const toCode = num === 1 ? 'ACTIVE' : num === 2 ? 'FINISHED' : 'DRAFT'
                        const alt = { ...idea, status: toCode }
                        console.warn('Retrying update with status as string code:', toCode)
                        res = await apiUpdateIdea(alt)
                    }
                    if (res) {
                        toast.success("Ideia atualizada com sucesso")

                        // Update local store with the response
                        if (res.id) {
                            const serverStatus = parseStatus(res.status)
                            set((prev) => {
                                const updatedResponses = prev.responses.map(r => {
                                    if (String(r.id) === String(res.id)) {
                                        return {
                                            ...r,
                                            title: res.title ?? r.title,
                                            tags: Array.isArray(res.tags) ? res.tags : r.tags,
                                            status: serverStatus ?? r.status,
                                            raw_content: (res as any).raw_content ?? r.raw_content,
                                        }
                                    }
                                    return r
                                })

                                const updatedRecent = prev.recentIdeas.map(rr => {
                                    if (String(rr.id) === String(res.id)) {
                                        return {
                                            ...rr,
                                            title: res.title ?? rr.title,
                                            status: serverStatus ?? rr.status,
                                            ai_classification: res.ai_classification ?? rr.ai_classification,
                                            raw_content: (res as any).raw_content ?? rr.raw_content,
                                        }
                                    }
                                    return rr
                                })

                                return { ...prev, responses: updatedResponses, recentIdeas: updatedRecent }
                            })
                        }

                        return true
                    }
                    toast.error("Erro ao atualizar ideia")
                    return false
                } catch (err) {
                    console.error('updateIdea error', err)
                    toast.error("Erro ao atualizar ideia")
                    return false
                }
            },

            deleteIdea: async(id?: string) => {
                if (!id) {
                    toast.error('ID da ideia ausente')
                    return false
                }
                try {
                    const ok = await apiDeleteIdea(id)
                    if (ok) {
                        toast.success('Ideia removida')
                        // optimistically remove from responses
                        set((prev) => ({ ...prev, responses: prev.responses.filter(r => r.id !== id) }))
                        // refresh mapped data
                        try {
                            const state = get()
                            if (state && typeof state.mapIdeas === 'function') {
                                await state.mapIdeas()
                            }
                        } catch (err) {
                            console.warn('mapIdeas failed after deleteIdea', err)
                        }
                        return true
                    }
                    toast.error('Erro ao excluir ideia')
                    return false
                } catch (err) {
                    console.error('deleteIdea error', err)
                    toast.error('Erro ao excluir ideia')
                    return false
                }
            },
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