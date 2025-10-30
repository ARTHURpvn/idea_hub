import axios from "axios"
import { getCookie } from "cookies-next"

export enum Status {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
}

export interface IdeaResponse {
    id?: string;
    title: string;
    status: Status;
    ai_classification: string;
    month?: number;
    created_at?: string;
}

interface IdeaDTO {
    id?: string;
    title?: string;
    status?: string | number;
    ai_classification?: string;
    created_at: string;
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
