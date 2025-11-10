import axios from "axios"
import { getCookie } from "cookies-next"
import {Chat} from "../store/chat_store";

// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/agent"
console.log('API_BASE for axios requests:', API_BASE)
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

interface CreateChatResponse {
    chat_id: string;
}

interface MessageRequest {
    chat_id: string;
    message: string;
}

interface MessageResponse {
    message: string;
}

export const createChatReq = async(idea_id: string): Promise<CreateChatResponse | false> => {
    const token = getCookie("token") as string | undefined;
    if (!token) return false;

    try {
        const res = await api.post(`/idea/${idea_id}`, {}, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        return res.data;

    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("createChat: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("createChat: no response received", error.message);
        } else {
            console.error("createChat:", error?.message ?? error);
        }
        return false;
    }
}

export const sendMessageReq = async({chat_id, message}: MessageRequest): Promise<MessageResponse | false> => {
    const token = getCookie("token") as string | undefined;
    if (!token) return false;

    try {
        const res = await api.post(`/${chat_id}?message=${message}`, {}, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        return res.data;

    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("sendMessage: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("sendMessage: no response received", error.message);
        } else {
            console.error("sendMessage:", error?.message ?? error);
        }
        return false;
    }
}

export const getAllChatsReq = async(): Promise<Chat[] | false> => {
    const token = getCookie("token") as string | undefined;
    if (!token) return false;

    try {
        const res = await api.get<Chat[]>("/", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        return res.data;
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("getAllChats: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("getAllChats: no response received", error.message);
        } else {
            console.error("getAllChats:", error?.message ?? error);
        }
        return false;
    }
}

export const deleteChatReq = async(chat_id: string): Promise<boolean> => {
    const token = getCookie("token") as string | undefined;
    if (!token) return false;

    try {
        await api.delete(`/${chat_id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        return true;
    } catch (error: any) {
        console.error(error)
        if (error?.response) {
            console.error("deleteChat: server responded with", error.response.status, error.response.data);
        } else if (error?.request) {
            console.error("deleteChat: no response received", error.message);
        } else {
            console.error("deleteChat:", error?.message ?? error);
        }
        return false;
    }
}