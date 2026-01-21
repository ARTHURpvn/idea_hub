"use client"

import React from "react";
import { usePathname } from "next/navigation";
import ToasterClient from "@/components/toaster-client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/MenuBar";
import { useIsMobile } from "@/hooks/use-mobile";
import MenuMobile from "./MenuMobile";
import WelcomeModal from "./WelcomeModal";

interface Props {
  children: React.ReactNode;
}

export default function AuthAwareLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const mobile = useIsMobile()
  const isAuthRoute = pathname.startsWith("/auth") || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/auth/");
  const isHomePage = pathname === "/";
  const isPublicRoute = isAuthRoute || isHomePage;

  // Rotas públicas (auth e home) não mostram menu
  if (isPublicRoute) {
    return (
      <>
        <ToasterClient />
        {children}
      </>
    );
  }

  // Rotas protegidas com menu
  if (mobile) {
    return (
      <>
        <ToasterClient />
        <WelcomeModal />
        <MenuMobile />
        <main className="w-full pb-20">{children}</main>
      </>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ToasterClient />
        <WelcomeModal />
        <main className="w-full">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
