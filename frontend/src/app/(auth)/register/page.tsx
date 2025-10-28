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
import {req_register} from "../../../requests/auth";
import Link from "next/link"

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

const LoginPage = () => {
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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const res = await req_register(values)
        if(res != false) form.reset()
    }
    return (
        <div className="flex items-center justify-center h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Registar-se na Plataforma</CardTitle>
                    <CardDescription>
                        Insira suas credenciais para criar uma conta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Insira seu Nome Completo" type={"text"} maxLength={40} {...field} />
                                        </FormControl>
                                        <FormDescription>
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
                                        <FormLabel>Gmail</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Insira seu email" type={"email"} maxLength={40} {...field} />
                                        </FormControl>
                                        <FormDescription>
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
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input placeholder="Confirme sua Senha" type={conf} required maxLength={24} {...field} />
                                                <button onClick={toggleConf} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                    {conf === "password" ? <EyeClosedIcon /> : <EyeIcon />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Confirme a sua senha.
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
                    <p>
                        Ja tem uma conta?
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={"/login"}>
                            Logar
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default LoginPage