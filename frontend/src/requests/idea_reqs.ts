import axios from "axios"
import { getCookie } from "cookies-next"

export enum Status {
    DRAFT = "Criado",
    ACTIVE = "Em Progresso",
    FINISHED = "Terminada",
}

export interface IdeaResponse {
    id?: string;
    title: string;
    status: Status;
    ai_classification: string;
    raw_content?: string;
    month?: number;
    created_at?: string;
    tags?: string[];
}

export interface IdeaCreate {
    title: string;
    tags: string[]
}

export interface IdeaDTO {
    id: string;
    title?: string;
    status?: string | number;
    ai_classification?: string;
    raw_content?: string;
    created_at?: string;
    tags?: string[];
}

// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

export function parseStatus(value: unknown): Status {
    // treat null/undefined as DRAFT
    if (!value && value !== 0) return Status.DRAFT;
    // numeric codes (0,1,2) or string numbers
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
        const n = Number(value);
        if (n === 1) return Status.ACTIVE;
        if (n === 2) return Status.FINISHED;
        return Status.DRAFT;
    }

    const s = String(value).trim().toUpperCase();
    // english codes
    if (s === "ACTIVE" ) return Status.ACTIVE;
    if (s === "FINISHED") return Status.FINISHED;
    if (s === "DRAFT") return Status.DRAFT;

    // portuguese labels
    if (s === "CRIADO" ) return Status.DRAFT;
    if (s === "EM PROGRESSO" || s === "EM PROGRESSO".toUpperCase()) return Status.ACTIVE;
    if (s === "TERMINADA" || s === "TERMINADO") return Status.FINISHED;

    // fallback
    return Status.DRAFT;
}

export const createIdea = async (idea: IdeaCreate) => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("getIdeas: missing auth token (cookies)");
        return false;
    }

    try {
        await api.post("/api/idea", {
            title: idea.title,
            tags: idea.tags,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return true
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("getIdeas: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("getIdeas: no response received", error.message);
        } else {
            console.error("getIdeas:", error?.message ?? error);
        }
        return false
    }
}

export const getIdeas = async (): Promise<IdeaResponse[]> => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("getIdeas: missing auth token (cookies)");
        return [];
    }

    try {
        const res = await api.get("/api/idea", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            timeout: 8000,
        });
        console.log(res.data)
        const raw = res.data;
        if (!Array.isArray(raw)) {
            console.warn("getIdeas: unexpected response format, expected array", raw);
            return [];
        }

        console.log(raw)

        const mapped: IdeaResponse[] = raw.map((idea) => ({
            id: idea.id ?? undefined,
            title: idea.title ?? "(sem título)",
            status: parseStatus(idea.status),
            ai_classification: idea.ai_classification ?? "",
            // prefer raw_content, fallback to description or empty string
            raw_content: idea.raw_content ?? idea.description ?? "",
            // tags may come from backend as array
            tags: Array.isArray(idea.tags) ? idea.tags : (idea.tags ? String(idea.tags).split(",").map((s: string) => s.trim()).filter(Boolean) : []),
            month: idea.created_at ? new Date(idea.created_at).getMonth() + 1 : undefined,
            created_at: idea.created_at ?? undefined,
        }));

        return mapped;
    } catch (error: any) {
        // Axios error handling
        if (error?.response) {
            console.error("getIdeas: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("getIdeas: no response received", error.message);
        } else {
            console.error("getIdeas:", error?.message ?? error);
        }
        return [];
    }
}

export const getIdeaById = async (id: string): Promise<IdeaResponse | null> => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("getIdeaById: missing auth token (cookies)");
        return null;
    }
    try{
        const res = await api.get<IdeaResponse>(`/api/idea/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const raw: IdeaResponse = res.data;

        if (!raw) {
            console.warn("getIdeaById: unexpected response format, expected object", raw);
            return null;
        }
        return raw

    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("getIdeaById: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("getIdeaById: no response received", error.message);
        } else {
            console.error("getIdeaById:", error?.message ?? error);
        }
        return null;
    }
}

export const updateIdea = async (idea: Partial<IdeaDTO>) => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("updateIdea: missing auth token (cookies)");
        return null;
    }

    const doPatch = async (payload: Partial<IdeaDTO>) => {
        // normalize status to english code strings before sending to avoid numeric 0 being interpreted incorrectly
        const sendPayload = { ...payload }
        if (sendPayload.status !== undefined) {
            const s = sendPayload.status
            if (typeof s === 'number' || (typeof s === 'string' && /^\d+$/.test(String(s)))) {
                const n = Number(s)
                sendPayload.status = n === 1 ? 'ACTIVE' : n === 2 ? 'FINISHED' : 'DRAFT'
            } else if (typeof s === 'string') {
                // normalize known localized labels to english codes
                const up = s.trim().toUpperCase()
                if (up === 'CRIADO' || up === 'DRAFT') sendPayload.status = 'DRAFT'
                else if (up === 'EM PROGRESSO' || up === 'ACTIVE') sendPayload.status = 'ACTIVE'
                else if (up === 'TERMINADA' || up === 'TERMINADO' || up === 'FINISHED') sendPayload.status = 'FINISHED'
                else sendPayload.status = up
            }
        }
        console.log('PATCH payload (normalized):', sendPayload)
        const res = await api.patch(`/api/idea/${payload.id}`, sendPayload, {
             headers: {
                 Authorization: `Bearer ${token}`,
             },
         });
         return res;
     }

    try {
        try {
            const res = await doPatch(idea)
            if (res && res.data) return res.data
            return {
                id: idea.id,
                title: idea.title,
                status: idea.status,
                tags: idea.tags ?? [],
            }
        } catch (error: any) {
            // if server rejected the payload (validation error 422), try alternate status format
            if (error?.response?.status === 422 && idea && idea.status !== undefined) {
                console.error('updateIdea validation error (422):', error.response.data)
                try {
                    let altStatus: string | number | undefined = undefined
                    if (typeof idea.status === 'string') {
                        // map from string code to numeric
                        const up = idea.status.toUpperCase()
                        if (up === 'ACTIVE') altStatus = 1
                        else if (up === 'FINISHED') altStatus = 2
                        else altStatus = 0
                    } else if (typeof idea.status === 'number') {
                        // map from number to english code
                        const n = Number(idea.status)
                        if (n === 1) altStatus = 'ACTIVE'
                        else if (n === 2) altStatus = 'FINISHED'
                        else altStatus = 'DRAFT'
                    }

                    const altPayload = { ...idea, status: altStatus }
                    const retryRes = await doPatch(altPayload)
                    if (retryRes && retryRes.data) return retryRes.data
                    return {
                        id: idea.id,
                        title: idea.title,
                        status: altStatus,
                        tags: idea.tags ?? [],
                    }
                } catch (err2: any) {
                    console.error('updateIdea retry failed', err2)
                    return null
                }
            }

            // otherwise rethrow so outer catch handles logging
            throw error
        }
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("updateIdea: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("updateIdea: no response received", error.message);
        } else {
            console.error("updateIdea:", error?.message ?? error);
        }
        return null;
    }
}

export const deleteIdea = async (id: string) => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("deleteIdea: missing auth token (cookies)");
    }

    try {
        await api.delete(`/api/idea/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return true
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("getIdeaById: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("getIdeaById: no response received", error.message);
        } else {
            console.error("getIdeaById:", error?.message ?? error);
        }
        return false;
    }
}
