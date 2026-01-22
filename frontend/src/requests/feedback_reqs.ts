import axios from 'axios';
import { getCookie } from "cookies-next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface FeedbackData {
    name: string;
    email: string;
    type: 'bug' | 'feedback' | 'sponsor';
    message: string;
}

export const submitFeedback = async (data: FeedbackData) => {
    try {
        const token = getCookie("token") as string | undefined;
        const response = await axios.post(`${API_URL}/api/feedback`, data, {
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            },
            withCredentials: true,
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Erro ao enviar feedback');
    }
};
