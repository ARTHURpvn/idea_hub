import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {LoginPayload, req_login, req_register} from "../requests/auth";
import { setCookie, getCookie } from "cookies-next/client";
import { toast } from "sonner";

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
                let res: LoginPayload | false  = false

                try {
                    res = await req_login(data)
                } catch (error) {
                    console.log(error)
                    return false
                }

                console.log('login result:', res)

                if (!res) return false

                set({name: res.name, email: res.email})
                if (!res.access_token) {
                    console.warn('No access_token returned from login response')
                    toast.error('Login não retornou token do servidor.')
                    return false
                }

                // set token cookie (client cannot set httpOnly)
                setCookie("token", res.access_token, {
                    maxAge: 60 * 60, // 1 hour
                    path: "/",
                    sameSite: "strict",
                    secure: process.env.NODE_ENV === 'production'
                })

                try {
                    const read = getCookie('token')
                    console.log('cookie token readback:', read)
                } catch (e) {
                    console.warn('could not read cookie after set', e)
                }

                setTimeout(() => {
                    window.location.href = "/dashboard"
                }, 2000)
                return true
            },

            register: async (name: string, email: string, password: string) => {
                const data={name, email, password}

                try {
                    await req_register(data)
                    setTimeout(() => {
                        window.location.href = "/auth/login"
                    }, 2000)
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
                    secure: true
                })

                toast.success("Desconectado com sucesso")
                window.location.href = "/auth/login"
            }
        }),

        {
            name: "auth-storage",
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