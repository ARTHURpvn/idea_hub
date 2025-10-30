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
}

export interface IdeaCreate {
    title: string;
    tags: [string]
}

interface IdeaDTO {
    id?: string;
    title?: string;
    status?: string | number;
    ai_classification?: string;
    raw_content?: string;
    created_at?: string;
}

// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

function parseStatus(value: unknown): Status {
    if (!value && value !== 0) return Status.DRAFT;
    const s = String(value).toUpperCase();
    if (s === "ACTIVE" || s === "1") return Status.ACTIVE;
    if (s === "FINISHED" || s === "2") return Status.FINISHED;
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


        const mapped: IdeaResponse[] = raw.map((idea) => ({
            id: idea.id ?? undefined,
            title: idea.title ?? "(sem título)",
            status: parseStatus(idea.status),
            ai_classification: idea.ai_classification ?? "",
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
        return false;
    }

    try {
        await api.patch(`/api/idea/${idea.id}`, idea, {
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
