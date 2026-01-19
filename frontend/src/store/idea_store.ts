import { create } from "zustand";
import {createIdea, getIdeas, IdeaDTO, IdeaResponse, Status, updateIdea as apiUpdateIdea, parseStatus, deleteIdea as apiDeleteIdea} from "../requests/idea_reqs";
import {createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";
import { JSONContent } from "@tiptap/react";
import { createChatReq, sendMessageReq } from "../requests/chat_reqs";

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

                const cleanedResponses: Array<Omit<IdeaResponse, "month" | "yearMonth">> = response.map(({ month, yearMonth, ...rest }) => ({ ...rest, id: rest.id !== undefined && rest.id !== null ? String(rest.id) : undefined }));

                // Group by yearMonth and sort chronologically
                const uniqueYearMonths: string[] = response
                    .map(r => r.yearMonth)
                    .filter((ym): ym is string => typeof ym === 'string')
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .sort(); // YYYY-MM format sorts correctly lexicographically

                const countsPerYearMonth: Record<string, number> = {};
                response.forEach(r => {
                    if (typeof r.yearMonth === 'string') {
                        countsPerYearMonth[r.yearMonth] = (countsPerYearMonth[r.yearMonth] || 0) + 1;
                    }
                });

                const monthShortNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

                // Convert YYYY-MM to display labels (e.g., "Nov/25", "Jan/26")
                const monthLabels = uniqueYearMonths.map(ym => {
                    const [year, month] = ym.split('-');
                    const monthNum = parseInt(month, 10);
                    const yearShort = year.slice(2); // Get last 2 digits of year
                    return `${monthShortNames[monthNum - 1]}/${yearShort}`;
                });

                const monthlyCounts = uniqueYearMonths.map(ym => countsPerYearMonth[ym] || 0);

                const currentDate = new Date();
                const currentYearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                const ideaCreatedThisMonth = response.filter(r => r.yearMonth === currentYearMonth).length;

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
                    if(response && response.id) {
                        toast.success("Ideia criada! 🚀", {
                            description: "Redirecionando para começar a desenvolver..."
                        })
                        // Redireciona diretamente para a ideia criada
                        window.location.href = `/ideas/${response.id}`

                        return true
                    }
                    else {
                        toast.error("Falha ao criar ideia", {
                            description: "O servidor não retornou os dados esperados"
                        })
                        return false
                    }
                }
                catch (error) {
                    toast.error("Erro ao criar ideia", {
                        description: "Verifique sua conexão e tente novamente"
                    })
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
                        if (!idea.raw_content) {
                            // Mostrar mensagem específica baseado no que foi atualizado
                            if (idea.status) {
                                const statusMessages: Record<string, string> = {
                                    'DRAFT': 'Ideia movida para Rascunho',
                                    'ACTIVE': 'Ideia em Progresso! 💪',
                                    'FINISHED': 'Ideia Concluída! 🎉'
                                }
                                const message = typeof idea.status === 'string' ? statusMessages[idea.status] : undefined
                                toast.success(message || "Status atualizado", {
                                    description: "Suas alterações foram salvas"
                                })
                            } else {
                                toast.success("Ideia atualizada! ✓", {
                                    description: "Todas as alterações foram salvas"
                                })
                            }
                        }

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
                    toast.error("Falha ao atualizar", {
                        description: "O servidor não respondeu corretamente"
                    })
                    return false
                } catch (err) {
                    console.error('updateIdea error', err)
                    toast.error("Erro ao salvar alterações", {
                        description: "Verifique sua conexão e tente novamente"
                    })
                    return false
                }
            },

            deleteIdea: async(id?: string) => {
                if (!id) {
                    toast.error('Erro ao excluir', {
                        description: 'ID da ideia não foi fornecido'
                    })
                    return false
                }
                try {
                    const ok = await apiDeleteIdea(id)
                    if (ok) {
                        toast.success('Ideia removida! 🗑️', {
                            description: 'A ideia foi excluída permanentemente'
                        })
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
                    toast.error('Falha ao excluir', {
                        description: 'Não foi possível remover a ideia. Tente novamente.'
                    })
                    return false
                } catch (err) {
                    console.error('deleteIdea error', err)
                    toast.error('Erro ao excluir ideia', {
                        description: 'Verifique sua conexão e tente novamente'
                    })
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