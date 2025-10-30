import axios from "axios"
import { getCookie } from "cookies-next";

export interface Roadmap {
    id?: string;
    idea_id: string;
    exported_to: string;
    generated_at: string;
    steps: RoadmapStep[];
}
interface RoadmapStep {
    id?: string;
    step_order: number;
    title: string;
    description: string;
    tasks: RoadmapTask[];
}
interface RoadmapTask {
    id?: string;
    task_order: number;
    description: string;
    suggested_tools: string[];
}


// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

export const getAllRoadmaps = async(): Promise<Roadmap[] | false> => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("getIdeas: missing auth token (cookies)");
        return false;
    }

    try {
        const res = await api.get<Roadmap[]>("/api/roadmap", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const raw: Roadmap[] = res.data;
        console.log(raw)
        return raw

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

export const getRoadmapById = async(id: string): Promise<Roadmap | false> => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("getIdeaById: missing auth token (cookies)");
        return false;
    }
    try{
        const res = await api.get<Roadmap>(`/api/roadmap/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        const raw: Roadmap = res.data;
        console.log(raw)
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
        return false;
    }
}

export const createRoadmap = async(id: string, exported_to: string) => {
    const token = getCookie("token") as string | undefined;
    if (!token) {
        console.warn("createRoadmap: missing auth token (cookies)");
        return false;
    }
    try{
        await api.post(`/api/roadmap/${id}`, {
            exported_to: exported_to,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        return true
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("createRoadmap: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("createRoadmap: no response received", error.message);
        } else {
            console.error("createRoadmap:", error?.message ?? error);
        }
        return false;
    }
}