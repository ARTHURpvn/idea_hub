import axios from "axios"
import {getCookie } from "cookies-next/client"
import { toast } from "sonner"

interface LoginRequest {
    email: string,
    password: string,
}

// payload returned by the backend on successful login
export interface LoginPayload {
    access_token?: string,
    name: string,
    email: string,
    first_login?: boolean,
}

interface RegisterRequest {

    email: string,
    name: string,
    password: string,
}

// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
console.log('API_BASE for axios requests:', API_BASE)
const api = axios.create({ baseURL: API_BASE})

// return LoginPayload on success, or false on error
export const req_login = async(data: LoginRequest): Promise<LoginPayload | false> => {
    const loadingId = toast.loading("Autenticando...", {
        description: "Verificando suas credenciais"
    })

    try {
        const res = await api.post("/auth/login", {
            email: data.email,
            password: data.password,
        })

        toast.dismiss(loadingId)

        // normalize response: some backends return { data: { ... } } or { access_token, ... }
        const raw = res.data
        console.log('raw login response:', raw)
        const payload = raw?.data ?? raw

        const access_token = payload?.access_token ?? payload?.token ?? null
        const name = payload?.name ?? payload?.user?.name ?? payload?.data?.name ?? payload?.user?.username ?? null
        const email = payload?.email ?? payload?.user?.email ?? payload?.data?.email ?? null
        const first_login = payload?.first_login ?? false

        if (!name && !email) {
            console.warn('Login response missing user info, payload:', payload)
            toast.error("Erro na resposta do servidor", {
                description: "Dados do usuário não foram retornados corretamente"
            })
            return false
        }

        const normalized: LoginPayload = {
            access_token: access_token ?? undefined,
            name: name ?? "",
            email: email ?? "",
            first_login: first_login,
        }

        console.log('normalized login payload:', normalized)
        toast.success('Login realizado com sucesso!', {
            description: `Bem-vindo ${!first_login ? "de volta": ""}, ${name}!`
        })
        return normalized
    } catch (error: any) {
        toast.dismiss(loadingId)
        console.error('req_login caught error:', error)

        // network / CORS / server down cases often have no response
        const status = error?.response?.status
        const message = error?.message ?? 'Erro ao conectar com o servidor.'

        if (!status) {
            // provide more helpful message for common network issues
            if (error?.code === 'ERR_NETWORK' || /Network Error/i.test(message)) {
                toast.error('Erro de conexão', {
                    description: 'Não foi possível conectar ao servidor. Verifique sua internet ou se o backend está rodando.'
                })
            } else if (/CORS/i.test(message) || (error?.request && !error?.response)) {
                // browser CORS issues show up as blocked in DevTools; help the user check
                toast.error('Erro de segurança CORS', {
                    description: 'Problema de configuração do servidor. Entre em contato com o suporte.'
                })
            } else {
                toast.error('Erro desconhecido', {
                    description: message
                })
            }
        } else {
            if (status === 400) {
                toast.error("Usuário não encontrado", {
                    description: "Verifique o e-mail digitado ou crie uma nova conta"
                })
            } else if (status === 401 || status === 422) {
                toast.error("Credenciais inválidas", {
                    description: "E-mail ou senha incorretos. Tente novamente."
                })
            } else {
                toast.error(`Erro no servidor (${status})`, {
                    description: message || "Ocorreu um erro inesperado. Tente novamente."
                })
            }
        }
    }
    return false
}

export const req_register = async(data: RegisterRequest): Promise<boolean> => {
    const loadingId = toast.loading("Criando sua conta...", {
        description: "Isso pode levar alguns segundos"
    })
    try {
        const res = await api.post("/auth/register", {
            email: data.email,
            name: data.name,
            password: data.password,
        })

        toast.dismiss(loadingId)
        toast.success("Conta criada com sucesso! 🎉", {
            description: "Você será redirecionado para fazer login"
        })
        return true

    } catch (error: any) {
        toast.dismiss(loadingId)

        const status = error?.response?.status
        const errorData = error?.response?.data

        if (status === 400) {
            // Check if it's a duplicate email error
            if (errorData?.detail?.includes('email') || errorData?.message?.includes('email')) {
                toast.error("E-mail já cadastrado", {
                    description: "Este e-mail já está em uso. Tente fazer login ou use outro e-mail."
                })
                return false
            } else {
                toast.error("Dados inválidos", {
                    description: "Verifique os dados informados e tente novamente"
                })
                return false

            }
        } else if (status === 401 || status === 422) {
            toast.error("Erro de validação", {
                description: "Verifique se todos os campos foram preenchidos corretamente"
            })
            return false
        } else {
            toast.error("Erro ao criar conta", {
                description: "Não foi possível conectar ao servidor. Tente novamente."
            })
            return false
        }

        return false
    }
}

export const validateToken = async() => {
    const token = getCookie("token")
    try {
       const res = await api.post("/auth/token", {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        console.log(res.data)
        return res.data.validated
    } catch (error: any) {
        return false
    }
}