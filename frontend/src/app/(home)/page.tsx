"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, MessageSquare, BarChart3, Lightbulb, Zap, Target, Rocket, CheckCircle2, Users, TrendingUp, Clock, Brain, FileText, ChevronDown, Plus, Minus } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useAuthStore } from "@/store/auth_store"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StructuredData from "@/components/StructuredData"

// FAQ Item Component
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="border-2 hover:border-primary/30 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold pr-8">{question}</CardTitle>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </motion.div>
        </CardHeader>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0">
              <p className="text-muted-foreground">{answer}</p>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

const Home = () => {
  const router = useRouter()
  const email = useAuthStore((state) => state.email)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Se já estiver logado, redireciona para o dashboard
    if (email) {
      router.push("/dashboard")
    }
  }, [email, router])

  if (!mounted) return null

  const features = [
    {
      icon: Lightbulb,
      title: "Organize suas Ideias",
      description: "Mantenha todas as suas ideias em um só lugar, organizadas e estruturadas de forma inteligente.",
      color: "text-yellow-500"
    },
    {
      icon: Sparkles,
      title: "IA Especializada",
      description: "Conte com uma inteligência artificial que entende seu projeto e oferece sugestões valiosas.",
      color: "text-purple-500"
    },
    {
      icon: MessageSquare,
      title: "Chat Interativo",
      description: "Converse naturalmente com a IA sobre suas ideias, tire dúvidas e receba orientações.",
      color: "text-blue-500"
    },
    {
      icon: BarChart3,
      title: "Acompanhe o Progresso",
      description: "Visualize o desenvolvimento das suas ideias com métricas e gráficos intuitivos.",
      color: "text-green-500"
    }
  ]

  const benefits = [
    {
      icon: Brain,
      title: "IA que Entende Contexto",
      description: "Nossa IA analisa o contexto completo do seu projeto e oferece sugestões personalizadas para desenvolvimento."
    },
    {
      icon: Clock,
      title: "Economize Tempo",
      description: "Reduza horas de pesquisa e planejamento. A IA te ajuda a estruturar ideias rapidamente."
    },
    {
      icon: FileText,
      title: "Editor Rico",
      description: "Escreva e formate suas ideias com um editor poderoso que salva automaticamente."
    },
    {
      icon: TrendingUp,
      title: "Acompanhe Evolução",
      description: "Veja como suas ideias evoluem ao longo do tempo com métricas detalhadas."
    },
    {
      icon: Users,
      title: "Grátis no MVP",
      description: "Todos os recursos principais disponíveis gratuitamente durante a fase beta. Ajude-nos a melhorar!"
    },
    {
      icon: Zap,
      title: "Em Desenvolvimento Ativo",
      description: "Novas funcionalidades sendo adicionadas constantemente baseadas no feedback dos testadores."
    }
  ]

  const steps = [
    {
      number: "01",
      title: "Crie sua Conta",
      description: "Cadastre-se gratuitamente em segundos e comece a organizar suas ideias.",
      icon: Target
    },
    {
      number: "02",
      title: "Adicione suas Ideias",
      description: "Escreva suas ideias, adicione detalhes e deixe a plataforma organizá-las automaticamente.",
      icon: Lightbulb
    },
    {
      number: "03",
      title: "Converse com a IA",
      description: "Use o chat inteligente para desenvolver suas ideias com ajuda da IA especializada.",
      icon: MessageSquare
    },
    {
      number: "04",
      title: "Realize seus Projetos",
      description: "Transforme suas ideias em realidade com planejamento e acompanhamento constante.",
      icon: Rocket
    }
  ]

  const faqs = [
    {
      question: "O IdeaHub é realmente grátis?",
      answer: "Sim! O IdeaHub está em fase MVP (Produto Mínimo Viável) e é totalmente gratuito. Estamos buscando testadores para nos ajudar a melhorar a plataforma antes do lançamento oficial."
    },
    {
      question: "Por que está grátis? Qual o motivo?",
      answer: "Estamos em fase beta e queremos construir o melhor produto possível com feedback real. Sua participação como testador é valiosa para identificar bugs e sugerir melhorias."
    },
    {
      question: "Posso encontrar bugs ou problemas?",
      answer: "Sim, é possível. Como estamos em MVP, alguns recursos podem ter bugs ou instabilidades. Reportar esses problemas nos ajuda muito a melhorar! Pedimos paciência e compreensão nesta fase inicial."
    },
    {
      question: "Como funciona a IA?",
      answer: "Nossa IA é especializada em desenvolvimento de projetos. Ela analisa suas ideias, oferece sugestões de melhorias, ajuda com tecnologias, e responde perguntas específicas sobre implementação."
    },
    {
      question: "Preciso de conhecimento técnico?",
      answer: "Não! O IdeaHub foi projetado para ser intuitivo e fácil de usar. Seja você um desenvolvedor experiente ou alguém com uma ideia inicial, a plataforma se adapta ao seu nível."
    },
    {
      question: "Minhas ideias são privadas?",
      answer: "Absolutamente. Todas as suas ideias são privadas e visíveis apenas para você. Levamos a segurança e privacidade dos seus dados muito a sério."
    },
    {
      question: "Como posso ajudar a melhorar a plataforma?",
      answer: "Use o IdeaHub naturalmente, reporte bugs que encontrar, e compartilhe sugestões! Seu feedback é essencial para tornarmos esta a melhor ferramenta de organização de ideias."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <StructuredData />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/ideahub_logo.png" alt="IdeaHub" width={150} height={50} className="sm:w-[200px] sm:h-[60px] object-contain" priority />
            <Badge variant="outline" className="hidden sm:inline-flex border-yellow-500 text-yellow-600 dark:text-yellow-400 text-xs">
              BETA
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="sm:size-default">Entrar</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="gap-1 sm:gap-2 sm:size-default">
                <span className="hidden xs:inline">Testar Grátis</span>
                <span className="xs:hidden">Testar</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto"
          >
            <div className="flex flex-col xs:flex-row items-center justify-center gap-2">
              <Badge variant="secondary" className="gap-2 text-xs">
                <Zap className="w-3 h-3" />
                Impulsionado por IA
              </Badge>
              <Badge variant="outline" className="gap-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 text-xs">
                🚀 BETA - MVP Gratuito
              </Badge>
            </div>
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight px-2">
              Transforme suas{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
                ideias
              </span>{" "}
              em realidade
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Organize, desenvolva e acompanhe seus projetos com a ajuda de inteligência artificial.
              <span className="block mt-2 text-sm sm:text-base text-yellow-600 dark:text-yellow-400 font-medium">
                ✨ Estamos em fase beta - Seja um dos primeiros testadores!
              </span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 px-4">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto min-w-[200px]">
                  Testar Gratuitamente <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto min-w-[200px]">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              Grátis durante o MVP • Ajude-nos a melhorar • Reporte bugs e ganhe prioridade no lançamento
            </p>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 sm:mt-16 relative px-2"
          >
            <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-border shadow-2xl">
              <div className="bg-card rounded-lg sm:rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center gap-2">
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground ml-2 sm:ml-4">IdeaHub - Dashboard</div>
                </div>
                <div className="p-4 sm:p-8 space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                    <div className="space-y-1.5 sm:space-y-2 flex-1">
                      <div className="h-3 sm:h-4 bg-muted rounded w-1/3" />
                      <div className="h-2 sm:h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-muted" />
                        <div className="h-2 sm:h-3 bg-muted rounded w-2/3" />
                        <div className="h-4 sm:h-6 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 sm:p-6 space-y-2 sm:space-y-3">
                    <div className="h-3 sm:h-4 bg-muted rounded w-1/4" />
                    <div className="h-20 sm:h-32 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4 sm:space-y-6"
            >
              <Badge variant="outline" className="gap-2 text-xs sm:text-sm">
                <Lightbulb className="w-3 h-3" />
                O Problema
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Suas ideias ficam perdidas?</h2>
              <div className="space-y-3 sm:space-y-4 text-muted-foreground">
                <p className="text-sm sm:text-base md:text-lg">
                  Você tem dezenas de ideias espalhadas em notas, documentos e anotações.
                  Quando precisa retomar uma ideia, perde tempo procurando onde deixou.
                </p>
                <p className="text-sm sm:text-base md:text-lg">
                  Ao tentar desenvolver sozinho, surgem dúvidas sobre tecnologias,
                  implementação e melhores práticas. Pesquisar toma tempo e quebra seu fluxo criativo.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4 sm:space-y-6"
            >
              <Badge variant="default" className="gap-2 text-xs sm:text-sm">
                <Sparkles className="w-3 h-3" />
                A Solução
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Centralize e desenvolva com IA</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm sm:text-base">Tudo em um só lugar</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Todas as suas ideias organizadas, categorizadas e sempre acessíveis.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm sm:text-base">IA como co-piloto</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Assistente inteligente responde dúvidas, sugere melhorias e acelera seu desenvolvimento.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm sm:text-base">Acompanhe evolução</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Veja seu progresso com métricas e mantenha a motivação alta.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Card className="border-2 border-yellow-500/30 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                    🧪 Fase Beta - MVP
                  </Badge>
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  Estamos construindo algo incrível e precisamos de você!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  O IdeaHub está em desenvolvimento ativo. Ao se cadastrar, você se torna um <strong>testador beta</strong> e ajuda a moldar o futuro da plataforma.
                </p>
                <div className="grid md:grid-cols-3 gap-4 pt-4">
                  <div className="space-y-2">
                    <div className="text-3xl">✅</div>
                    <h3 className="font-semibold">Totalmente Grátis</h3>
                    <p className="text-sm text-muted-foreground">Durante toda a fase MVP, sem custo algum</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl">🐛</div>
                    <h3 className="font-semibold">Pode ter Bugs</h3>
                    <p className="text-sm text-muted-foreground">Reporte problemas e nos ajude a melhorar</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl">🚀</div>
                    <h3 className="font-semibold">Seu Feedback Importa</h3>
                    <p className="text-sm text-muted-foreground">Suas sugestões moldam o produto final</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold">Recursos Poderosos</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para transformar suas ideias em projetos concretos
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id={"func"} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold">Por que escolher o IdeaHub?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Mais do que uma ferramenta, um parceiro no desenvolvimento das suas ideias
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold">Como Funciona</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comece em minutos e veja suas ideias ganharem vida
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto">
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 opacity-30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id={"faq"} className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold">Perguntas Frequentes</h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa saber sobre o IdeaHub
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
            <Link href="/auth/register">
              <Button variant="outline" size="lg">
                Experimente Grátis Agora
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-green-500/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-6 bg-card border border-border rounded-2xl p-12 shadow-2xl"
          >
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
              🚀 Fase Beta - Testadores Necessários
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Pronto para testar?
            </h2>
            <p className="text-xl text-muted-foreground">
              Seja um dos primeiros a experimentar o IdeaHub. Sua participação é fundamental para criarmos a melhor ferramenta possível.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2 text-lg px-8">
                  Começar a Testar <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Grátis durante o MVP • Bugs podem ocorrer • Seu feedback molda o produto
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Image src="/ideahub_logo.png" alt="IdeaHub" width={140} height={35} className="object-contain" />
              <p className="text-sm text-muted-foreground">
                Transforme suas ideias em realidade com inteligência artificial.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#func" className="hover:text-foreground transition">Funcionalidades</Link></li>
                <li><Link href="#faq" className="hover:text-foreground transition">Dúvidas</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} IdeaHub. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
