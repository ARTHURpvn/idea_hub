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
import { EyeClosedIcon, EyeIcon, LogIn, Sparkles, Mail, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/auth_store"
import { toast } from "sonner"
import { motion } from "framer-motion"
import Image from "next/image"

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
                toast.warning("Acesso restrito 🔒", {
                    description: "Você precisa fazer login para acessar esta página"
                })
            } else if (reason === "token_expired") {
                toast.error("Sessão expirada ⏰", {
                    description: "Sua sessão expirou. Por favor, faça login novamente."
                })
            }
            const msg = params.get("message")
            if (msg) {
                toast.info(msg)
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
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="w-full shadow-2xl border-muted backdrop-blur-sm bg-card/95">
                    <CardHeader className="space-y-3 p-6 sm:p-8 text-center">
                        {/* Logo */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="flex justify-center mb-2"
                        >
                            <div className="relative w-38 h-18">
                                <Image
                                    src="/ideahub_logo.png"
                                    alt="IdeaHub Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Bem-vindo de volta!
                            </CardTitle>
                            <CardDescription className="text-sm sm:text-base mt-2">
                                Entre com suas credenciais para continuar
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8 pt-0">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-primary" />
                                                Email
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        placeholder="seu@email.com"
                                                        type="email"
                                                        maxLength={40}
                                                        className="h-11 pl-4 pr-4 rounded-lg border-muted-foreground/20 focus:border-primary transition-all"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-primary" />
                                                Senha
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        placeholder="••••••••"
                                                        type={pass}
                                                        required
                                                        maxLength={24}
                                                        className="h-11 pl-4 pr-12 rounded-lg border-muted-foreground/20 focus:border-primary transition-all"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={togglePass}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {pass === "password" ?
                                                            <EyeClosedIcon className="w-4 h-4" /> :
                                                            <EyeIcon className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg hover:shadow-xl"
                                >
                                    Entrar
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </form>
                        </Form>
                    </CardContent>

                    <CardFooter className="flex-col gap-4 p-6 sm:p-8 pt-0 border-t">
                        <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 h-px bg-border" />
                            <p className="text-xs text-muted-foreground">Não tem conta?</p>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        <Button
                            variant="outline"
                            className="w-full h-11 gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                            asChild
                        >
                            <Link href="/auth/register">
                                Criar nova conta
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Footer text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-muted-foreground mt-6"
                >
                    Ao continuar, você concorda com nossos termos de uso
                </motion.p>
            </motion.div>
        </div>
    )
}

export default LoginPage