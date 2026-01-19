"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function ToastTestPage() {
    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Toast Test Page 🎨</h1>
                <p className="text-muted-foreground">
                    Teste todos os tipos de notificações com as novas melhorias
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Success Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">✅ Success Toasts</CardTitle>
                        <CardDescription>Notificações de sucesso</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => toast.success("Operação concluída!")}
                            className="w-full"
                            variant="outline"
                        >
                            Success Simples
                        </Button>
                        <Button
                            onClick={() => toast.success("Ideia criada! 🚀", {
                                description: "Redirecionando para começar a desenvolver..."
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Success com Descrição
                        </Button>
                        <Button
                            onClick={() => toast.success("Login realizado!", {
                                description: "Bem-vindo de volta, João!"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Success Personalizado
                        </Button>
                    </CardContent>
                </Card>

                {/* Error Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">❌ Error Toasts</CardTitle>
                        <CardDescription>Notificações de erro</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => toast.error("Algo deu errado")}
                            className="w-full"
                            variant="outline"
                        >
                            Error Simples
                        </Button>
                        <Button
                            onClick={() => toast.error("Erro ao salvar", {
                                description: "Não foi possível salvar suas alterações"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Error com Descrição
                        </Button>
                        <Button
                            onClick={() => toast.error("Credenciais inválidas", {
                                description: "E-mail ou senha incorretos. Tente novamente."
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Error de Autenticação
                        </Button>
                    </CardContent>
                </Card>

                {/* Warning Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-yellow-600">⚠️ Warning Toasts</CardTitle>
                        <CardDescription>Notificações de aviso</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => toast.warning("Atenção necessária")}
                            className="w-full"
                            variant="outline"
                        >
                            Warning Simples
                        </Button>
                        <Button
                            onClick={() => toast.warning("Acesso restrito 🔒", {
                                description: "Você precisa fazer login para acessar esta página"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Warning de Acesso
                        </Button>
                        <Button
                            onClick={() => toast.warning("Sessão expirando", {
                                description: "Sua sessão irá expirar em 5 minutos"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Warning de Sessão
                        </Button>
                    </CardContent>
                </Card>

                {/* Info Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-blue-600">ℹ️ Info Toasts</CardTitle>
                        <CardDescription>Notificações informativas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => toast.info("Informação importante")}
                            className="w-full"
                            variant="outline"
                        >
                            Info Simples
                        </Button>
                        <Button
                            onClick={() => toast.info("Nova atualização disponível", {
                                description: "Versão 2.0 com novos recursos"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Info de Atualização
                        </Button>
                        <Button
                            onClick={() => toast.info("Dica do dia 💡", {
                                description: "Use Ctrl+S para salvar rapidamente"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Info com Dica
                        </Button>
                    </CardContent>
                </Card>

                {/* Loading Toasts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-primary">⏳ Loading Toasts</CardTitle>
                        <CardDescription>Notificações de carregamento</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => {
                                const id = toast.loading("Processando...")
                                setTimeout(() => {
                                    toast.dismiss(id)
                                    toast.success("Concluído!")
                                }, 2000)
                            }}
                            className="w-full"
                            variant="outline"
                        >
                            Loading Simples
                        </Button>
                        <Button
                            onClick={() => {
                                const id = toast.loading("Autenticando...", {
                                    description: "Verificando suas credenciais"
                                })
                                setTimeout(() => {
                                    toast.dismiss(id)
                                    toast.success("Login realizado!", {
                                        description: "Bem-vindo de volta!"
                                    })
                                }, 3000)
                            }}
                            className="w-full"
                            variant="outline"
                        >
                            Loading → Success
                        </Button>
                        <Button
                            onClick={() => {
                                const id = toast.loading("Salvando...", {
                                    description: "Aguarde um momento"
                                })
                                setTimeout(() => {
                                    toast.dismiss(id)
                                    toast.error("Erro ao salvar", {
                                        description: "Tente novamente"
                                    })
                                }, 2500)
                            }}
                            className="w-full"
                            variant="outline"
                        >
                            Loading → Error
                        </Button>
                    </CardContent>
                </Card>

                {/* Special Cases */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-purple-600">✨ Casos Especiais</CardTitle>
                        <CardDescription>Toasts com recursos especiais</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            onClick={() => toast.success("Salvo automaticamente ✓", {
                                description: "Suas anotações foram salvas",
                                duration: 2000
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Autosave (2s)
                        </Button>
                        <Button
                            onClick={() => toast("Toast neutro", {
                                description: "Sem tipo específico"
                            })}
                            className="w-full"
                            variant="outline"
                        >
                            Toast Neutro
                        </Button>
                        <Button
                            onClick={() => {
                                toast.success("Primeiro")
                                setTimeout(() => toast.info("Segundo"), 100)
                                setTimeout(() => toast.warning("Terceiro"), 200)
                                setTimeout(() => toast.error("Quarto"), 300)
                            }}
                            className="w-full"
                            variant="outline"
                        >
                            Múltiplos Toasts
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Real Examples */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>🎯 Exemplos Reais da Aplicação</CardTitle>
                    <CardDescription>Teste os toasts usados na aplicação</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 md:grid-cols-3">
                        <Button
                            onClick={() => toast.success("Ideia criada! 🚀", {
                                description: "Redirecionando para começar a desenvolver..."
                            })}
                            variant="default"
                        >
                            Criar Ideia
                        </Button>
                        <Button
                            onClick={() => toast.success("Ideia em Progresso! 💪", {
                                description: "Suas alterações foram salvas"
                            })}
                            variant="default"
                        >
                            Mover para Progresso
                        </Button>
                        <Button
                            onClick={() => toast.success("Ideia Concluída! 🎉", {
                                description: "Suas alterações foram salvas"
                            })}
                            variant="default"
                        >
                            Concluir Ideia
                        </Button>
                        <Button
                            onClick={() => toast.success("Roadmap gerado! 🗺️", {
                                description: "Seu roadmap foi criado e está pronto para uso"
                            })}
                            variant="default"
                        >
                            Criar Roadmap
                        </Button>
                        <Button
                            onClick={() => toast.success("Ideia removida! 🗑️", {
                                description: "A ideia foi excluída permanentemente"
                            })}
                            variant="destructive"
                        >
                            Excluir Ideia
                        </Button>
                        <Button
                            onClick={() => toast.success("Até logo! 👋", {
                                description: "Você foi desconectado com sucesso"
                            })}
                            variant="outline"
                        >
                            Logout
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
