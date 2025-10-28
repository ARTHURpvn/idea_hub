import axios from "axios"
import {getCookie, setCookie } from "cookies-next/client"
import { toast } from "sonner"

interface LoginRequest {
    email: string,
    password: string,
}

export interface LoginResponse {
    data: {
        access_token: string,
        name: string,
        email: string,
    }
}

interface RegisterRequest {

    email: string,
    name: string,
    password: string,
}

export const req_login = async(data: LoginRequest): Promise<LoginResponse> => {
    const loadingId = toast.loading("Fazendo login...")

    try {
        const res: LoginResponse = await axios.post("http://localhost:8000/auth/login", {
            email: data.email,
            password: data.password,
        })

        toast.dismiss(loadingId)
        toast.success("Login realizado com sucesso.")
        window.location.href = "/"
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
    }
    return {
        data: {
            access_token: "",
            name: "",
            email: "",
        }
    }
}

export const req_register = async(data: RegisterRequest) => {
    const loadingId = toast.loading("Criando conta...")
    try {
        const res = await axios.post("http://localhost:8000/auth/register", {
            email: data.email,
            name: data.name,
            password: data.password,
        })

        toast.dismiss(loadingId)
        toast.success("Login realizado com sucesso.")
        window.location.href = "/login"
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

export const logout = () => {
    setCookie("token", "", {
        maxAge: -1,
        path: "/",
        sameSite: "strict",
        httpOnly: true,
        secure: true
    })
    localStorage.removeItem("name")
    localStorage.removeItem("email")
}

export const validateToken = async() => {
    const token = getCookie("token")
    try {
       const res = await axios.get("http://localhost:8000/auth/validate",{
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