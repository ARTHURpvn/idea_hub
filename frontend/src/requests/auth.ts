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
}

interface RegisterRequest {

    email: string,
    name: string,
    password: string,
}

// use env so LAN devices can reach backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
console.log('API_BASE for axios requests:', API_BASE)
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

// return LoginPayload on success, or false on error
export const req_login = async(data: LoginRequest): Promise<LoginPayload | false> => {
    const loadingId = toast.loading("Fazendo login...")

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

        if (!name && !email) {
            console.warn('Login response missing user info, payload:', payload)
            toast.error("Resposta de login inválida do servidor.")
            return false
        }

        const normalized: LoginPayload = {
            access_token: access_token ?? undefined,
            name: name ?? "",
            email: email ?? "",
        }

        console.log('normalized login payload:', normalized)
        toast.success('Login realizado com sucesso.')
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
                toast.error('Erro de rede: não foi possível alcançar o servidor. Verifique se o backend está rodando e se a URL em NEXT_PUBLIC_API_URL está correta.')
            } else if (/CORS/i.test(message) || (error?.request && !error?.response)) {
                // browser CORS issues show up as blocked in DevTools; help the user check
                toast.error('Possível problema de CORS ou bloqueio de credenciais. Verifique as configurações de CORS no backend e se `withCredentials` é suportado.')
            } else {
                toast.error(message)
            }
        } else {
            if (status === 400) {
                toast.error("Usuário não encontrado.")
            } else if (status === 401 || status === 422) {
                toast.error("E-mail ou senha incorretos.")
            } else {
                toast.error(`Erro ${status}: ${message}`)
            }
        }
    }
    return false
}

export const req_register = async(data: RegisterRequest) => {
    const loadingId = toast.loading("Criando conta...")
    try {
        const res = await api.post("/auth/register", {
            email: data.email,
            name: data.name,
            password: data.password,
        })

        toast.dismiss(loadingId)
        toast.success("Conta criada com sucesso.")
        // don't redirect here; let caller handle navigation
        return res

    } catch (error: any) {
        toast.dismiss(loadingId)

        const status = error?.response?.status
        if (status === 400) {
            toast.error("Usuário não encontrado.")
        } else if (status === 401 || status === 422) {
            toast.error("E-mail ou senha incorretos.")
        } else {
            toast.error("Erro ao conectar com o servidor.")
        }

        return false
    }
}

export const validateToken = async() => {
    const token = getCookie("token")
    try {
       const res = await api.get("/auth/validate",{
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        console.log(res.data)
        return res.data.valid
    } catch (error: any) {
        return false
    }
}