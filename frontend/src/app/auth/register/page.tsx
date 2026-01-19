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
import { useState } from "react"
import { EyeClosedIcon, EyeIcon } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth_store"

const formSchema = z.object({
    email: z.email({
        message: "Insira um gmail Valido.",
    }).min(12, {
        message: "Email deve ter no minimo 12 caracteres.",
    }),

    name: z.string().min(10, {
        message: "Nome deve ter no minimo 10 caracteres",
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
    confirmPassword: z.string().min(1, {
        message: "Confirme sua senha",
    })
}).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Senhas não coincidem',
            path: ['confirmPassword'],
        })
    }
})

const RegisterPage = () => {
    const [pass, setPass] = useState<"text" | "password">("password")
    const [conf, setConf] = useState<"text" | "password">("password")
    const togglePass = () => {
        if (pass === "password") {
            setPass("text")
        } else {
            setPass("password")
        }
    }
    const toggleConf = () => {
        if (conf === "password") {
            setConf("text")
        } else {
            setConf("password")
        }
    }

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: ""
        },
    })
    const {register} = useAuthStore.getState()
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const res = await register(values.name, values.email, values.password)
        if(!res) form.reset()
    }
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md sm:max-w-lg">
                <CardHeader className="space-y-1 p-4 sm:p-6">
                    <CardTitle className="text-xl sm:text-2xl">Registrar-se na Plataforma</CardTitle>
                    <CardDescription className="text-sm">
                        Insira suas credenciais para criar uma conta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Insira seu Nome Completo" type={"text"} maxLength={40} {...field} />
                                        </FormControl>
                                        <FormDescription className="text-xs sm:text-sm">
                                            Insira o seu nome completo.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Gmail</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Insira seu email" type={"email"} maxLength={40} {...field} />
                                        </FormControl>
                                        <FormDescription className="text-xs sm:text-sm">
                                            Insira um email para ser cadastrado.
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
                                        <FormLabel className="text-sm">Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input placeholder="Insira sua Senha" type={pass} required maxLength={24} {...field} />
                                                <button type="button" onClick={togglePass} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                    {pass === "password" ? <EyeClosedIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-xs sm:text-sm">
                                            Insira a sua senha.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Confirmar Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input placeholder="Confirme sua Senha" type={conf} required maxLength={24} {...field} />
                                                <button type="button" onClick={toggleConf} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                    {conf === "password" ? <EyeClosedIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-xs sm:text-sm">
                                            Confirme a sua senha.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className={"w-full"}>Confirmar</Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex-col gap-2 p-4 sm:p-6">
                    <p className="text-sm text-muted-foreground">
                        Ja tem uma conta?
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={"/auth/login"}>
                            Logar
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default RegisterPage
