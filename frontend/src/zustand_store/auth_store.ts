import { create } from "zustand";
import { persist } from "zustand/middleware";
import {LoginResponse, req_login, req_register} from "../requests/auth";
import { setCookie } from "cookies-next/client";

interface AuthState {
    name: string;
    email: string;
}

interface AuthActions {
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
    persist(
        (set) => ({
            name: "",
            email: "",

            login: async (email: string, password: string) => {
                const data={email, password}
                let res: LoginResponse | null = null

                try {
                    res = await req_login(data)
                } catch (error) {
                    console.log(error)
                    return false
                }

                set({name: res.data.name, email: res.data.email})
                setCookie("token", res.data.access_token, {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: "/",
                    sameSite: "strict",
                    httpOnly: true,
                    secure: true
                })
                return true
            },
            register: async (name: string, email: string, password: string) => {
                const data={name, email, password}

                try {
                    await req_register(data)
                    return true
                } catch (error) {
                    console.log(error)
                    return false
                }
            },
            logout: () => {
                set({name: "", email: ""})
                setCookie("token", "", {
                    maxAge: -1,
                    path: "/",
                    sameSite: "strict",
                    httpOnly: true,
                    secure: true
                })
            }
        }),

        {
            name: "auth-storage",
        }
    )
)