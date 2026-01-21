import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthAwareLayout from "../components/AuthAwareLayout";
import { useIdeaStore } from "@/store/idea_store";
import { useRoadmapStore } from "@/store/roadmap_store";

import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ideahub-pvn.vercel.app'), // Altere para seu domínio real
  title: {
    default: "IdeaHub - Organize e Desenvolva suas Ideias com IA",
    template: "%s | IdeaHub"
  },
  description: "Plataforma gratuita para organizar, desenvolver e transformar suas ideias em projetos reais com ajuda de Inteligência Artificial. Crie roadmaps, converse com IA especializada e acompanhe o progresso das suas ideias.",
  keywords: [
    "organizar ideias",
    "gerenciador de ideias",
    "IA para ideias",
    "chat com IA",
    "roadmap de projetos",
    "desenvolvimento de ideias",
    "planejamento de projetos",
    "gestão de ideias",
    "inteligência artificial",
    "assistente IA",
    "ideias inovadoras",
    "brainstorming online",
    "gerenciamento de projetos",
    "startup ideas",
    "innovation management"
  ],
  authors: [{ name: "ARTHURpvn" }],
  creator: "ARTHURpvn",
  publisher: "ARTHURpvn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://ideahub-pvn.vercel.app",
    siteName: "IdeaHub",
    title: "IdeaHub - Organize e Desenvolva suas Ideias com IA",
    description: "Transforme suas ideias em projetos reais com ajuda de Inteligência Artificial. Grátis durante o MVP!",
    images: [
      {
        url: "/og-image.png", // Vamos criar este arquivo
        width: 1200,
        height: 630,
        alt: "IdeaHub - Plataforma de Gestão de Ideias com IA",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IdeaHub - Organize e Desenvolva suas Ideias com IA",
    description: "Transforme suas ideias em projetos reais com ajuda de Inteligência Artificial. Grátis durante o MVP!",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/ideahub_icon.png" },
      { url: "/ideahub_icon.png", sizes: "32x32", type: "image/png" },
      { url: "/ideahub_icon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/ideahub_icon.png" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://ideahub-pvn.vercel.app", // Altere para seu domínio real
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const mapIdeas = useIdeaStore.getState().mapIdeas
    const mapRoadmaps = useRoadmapStore.getState().mapRoadmaps
    mapRoadmaps()
    mapIdeas()
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="google-site-verification" content="HQDjdI5YTOe_h4l71vS8HrWByRB9w6V10-nyiPSqiaM" />
        <link rel="canonical" href="https://ideahub-pvn.vercel.app" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
      >
        <Analytics />
        <SpeedInsights />

        <AuthAwareLayout>
          {children}
        </AuthAwareLayout>
      </body>
    </html>
  );
}
