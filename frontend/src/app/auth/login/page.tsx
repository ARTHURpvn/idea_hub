"use client"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import { EyeClosedIcon, EyeIcon } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth_store"
import { toast } from "sonner"

const formSchema = z.object({
    email: z.email({
        message: "Insira um gmail Valido.",
    }).min(12, {
        message: "Username must be at least 12 characters.",
    }),

    password: z.string().min(8, {
        message: "Senha deve ter no minimo 8 caracteres",
    })
        .refine((val) => /[A-Z]/.test(val), {
            message: "Deve conter ao menos uma letra maiúscula",
        })
        .refine((val) => /[a-z]/.test(val), {
            message: "Deve conter ao menos uma letra minúscula",
        })
        .refine((val) => /\d/.test(val), {
            message: "Deve conter ao menos um número",
        })
        .refine((val) => /[!@#$%^&*(),.?":{}|<>/]/.test(val), {
            message: "Deve conter ao menos um caractere especial",
        }),
})


const LoginPage = () => {
    const [pass, setPass] = useState<"text" | "password">("password")

    const togglePass = () => {
        if (pass === "password") {
            setPass("text")
        } else {
            setPass("password")
        }
    }

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: ""
        },
    })

    // show toasts if redirected by the proxy with a reason
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search)
            const reason = params.get("reason")
            if (reason === "auth_required") {
                toast.error("É necessário estar logado para acessar essa página. Redirecionando para login.")
            }
            const msg = params.get("message")
            if (msg) {
                toast(msg)
            }
        } catch (e) {
            // noop
        }
    }, [])

    const {login} = useAuthStore.getState()
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const res = await login(values.email, values.password)
        if(res) form.reset()
    }
    return (
        <div className="flex items-center justify-center h-screen">

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Logar na Plataforma</CardTitle>
                    <CardDescription>
                        Insira suas credenciais para acessar sua conta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gmail</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Insira seu email" type={"email"} maxLength={40} {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Insira o email que foi cadastrado.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input placeholder="Insira sua Senha" type={pass} required maxLength={24} {...field} />
                                                <button onClick={togglePass} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                    {pass === "password" ? <EyeClosedIcon /> : <EyeIcon />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Insira a senha que foi cadastrada.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className={"w-full"}>Submit</Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={"/auth/register"}>
                            Registrar-se
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default LoginPage