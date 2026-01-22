"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Bug, MessageSquare, Heart, Send, Loader2 } from "lucide-react";
import { submitFeedback, FeedbackData } from "@/requests/feedback_reqs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeedbackPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<FeedbackData>({
        name: "",
        email: "",
        type: "feedback",
        message: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            toast.error("Por favor, preencha todos os campos");
            return;
        }

        setIsSubmitting(true);

        try {
            await submitFeedback(formData);
            toast.success("Feedback enviado com sucesso!", {
                description: "Obrigado pelo seu contato. Vamos analisar sua mensagem em breve!",
            });

            // Limpar formulário
            setFormData({
                name: "",
                email: "",
                type: "feedback",
                message: "",
            });

            // Redirecionar após 2 segundos
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (error: any) {
            toast.error("Erro ao enviar feedback", {
                description: error.message || "Tente novamente mais tarde",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const feedbackTypes = [
        {
            value: "bug",
            label: "Reportar Bug",
            icon: Bug,
            description: "Encontrou um problema? Nos conte!",
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
        {
            value: "feedback",
            label: "Dar Feedback",
            icon: MessageSquare,
            description: "Compartilhe suas ideias e sugestões",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            value: "sponsor",
            label: "Patrocinar",
            icon: Heart,
            description: "Apoie o desenvolvimento do projeto",
            color: "text-pink-500",
            bgColor: "bg-pink-500/10",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4 hover:bg-muted/50"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Fale Conosco
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Sua opinião é muito importante para nós. Compartilhe suas ideias, reporte bugs ou apoie o projeto!
                    </p>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>Envie sua mensagem</CardTitle>
                            <CardDescription>
                                Preencha o formulário abaixo e entraremos em contato o mais breve possível
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Nome */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome completo</Label>
                                    <Input
                                        id="name"
                                        placeholder="Seu nome"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        required
                                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        required
                                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                {/* Tipo de Feedback */}
                                <div className="space-y-3">
                                    <Label>Tipo de contato</Label>
                                    <RadioGroup
                                        value={formData.type}
                                        onValueChange={(value: any) =>
                                            setFormData({ ...formData, type: value })
                                        }
                                        className="grid grid-cols-1 md:grid-cols-3 gap-3"
                                    >
                                        {feedbackTypes.map((type) => (
                                            <Label
                                                key={type.value}
                                                htmlFor={type.value}
                                                className={`
                                                    flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer
                                                    transition-all duration-200 hover:scale-105
                                                    ${
                                                        formData.type === type.value
                                                            ? `border-primary ${type.bgColor}`
                                                            : "border-border hover:border-primary/50"
                                                    }
                                                `}
                                            >
                                                <RadioGroupItem
                                                    value={type.value}
                                                    id={type.value}
                                                    className="sr-only"
                                                />
                                                <type.icon
                                                    className={`h-8 w-8 mb-2 ${
                                                        formData.type === type.value
                                                            ? type.color
                                                            : "text-muted-foreground"
                                                    }`}
                                                />
                                                <span className="font-semibold text-sm text-center">
                                                    {type.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground text-center mt-1">
                                                    {type.description}
                                                </span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>

                                {/* Mensagem */}
                                <div className="space-y-2">
                                    <Label htmlFor="message">Mensagem</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Conte-nos mais sobre sua experiência, sugestão ou problema..."
                                        value={formData.message}
                                        onChange={(e) =>
                                            setFormData({ ...formData, message: e.target.value })
                                        }
                                        required
                                        rows={6}
                                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Quanto mais detalhes você fornecer, melhor poderemos ajudá-lo
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-105"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-5 w-5" />
                                            Enviar Mensagem
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6"
                >
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1">Estamos em fase MVP</h3>
                                    <p className="text-sm text-muted-foreground">
                                        O IdeaHub está em desenvolvimento ativo. Seu feedback nos ajuda a
                                        melhorar e criar uma experiência cada vez melhor para você!
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
