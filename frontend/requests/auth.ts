import axios from "axios"
import { toast } from "sonner"

interface LoginRequest {
    email: string,
    password: string,
}

export const req_login = async(data: LoginRequest) => {
    const loadingId = toast.loading("Fazendo login...")
    try {
        const res = await axios.post("http://localhost:8000/auth/login", {
            email: data.email,
            password: data.password,
        })

        toast.dismiss(loadingId)
        toast.success("Login realizado com sucesso.")
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