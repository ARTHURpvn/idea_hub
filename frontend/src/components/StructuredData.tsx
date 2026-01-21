import Script from 'next/script'

export default function StructuredData() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "IdeaHub",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL"
    },
    "description": "Plataforma gratuita para organizar, desenvolver e transformar suas ideias em projetos reais com ajuda de Inteligência Artificial",
    "url": "https://ideahub-pvn.vercel.app",
    "image": "https://ideahub-pvn.vercel.app/ideahub_logo.png",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "featureList": [
      "Organização de ideias com IA",
      "Chat inteligente para desenvolvimento de projetos",
      "Geração automática de roadmaps",
      "Editor de texto avançado",
      "Dashboard de métricas e progresso",
      "Totalmente gratuito no MVP"
    ]
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "IdeaHub",
    "url": "https://ideahub-pvn.vercel.app",
    "logo": "https://ideahub-pvn.vercel.app/ideahub_logo.png",
    "description": "IdeaHub ajuda empreendedores, desenvolvedores e criativos a organizarem e desenvolverem suas ideias",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "availableLanguage": ["Portuguese"]
    },
    "sameAs": [
      "https://www.linkedin.com/in/arthurpvn/"
    ]
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://ideahub-pvn.vercel.app"
      }
    ]
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "O IdeaHub é realmente grátis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim! O IdeaHub está em fase MVP (Produto Mínimo Viável) e é totalmente gratuito. Estamos buscando testadores para nos ajudar a melhorar a plataforma antes do lançamento oficial."
        }
      },
      {
        "@type": "Question",
        "name": "Como a IA pode me ajudar com minhas ideias?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nossa IA especializada conversa com você sobre suas ideias, oferece sugestões, ajuda a identificar desafios e oportunidades, e auxilia no planejamento de próximos passos."
        }
      },
      {
        "@type": "Question",
        "name": "Posso usar em dispositivos móveis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim! O IdeaHub é responsivo e funciona perfeitamente em smartphones, tablets e desktops."
        }
      },
      {
        "@type": "Question",
        "name": "Meus dados estão seguros?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim! Todas as suas ideias são armazenadas de forma segura e privada. Apenas você tem acesso ao seu conteúdo."
        }
      }
    ]
  }

  return (
    <>
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  )
}
