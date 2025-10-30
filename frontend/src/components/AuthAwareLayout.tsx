"use client"

import React from "react";
import { usePathname } from "next/navigation";
import ToasterClient from "@/components/toaster-client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/MenuBar";
import { useIsMobile } from "@/hooks/use-mobile";
import MenuMobile from "./MenuMobile";

interface Props {
  children: React.ReactNode;
}

export default function AuthAwareLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const mobile = useIsMobile()
  const isAuthRoute = pathname.startsWith("/auth") || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/auth/");

  if (isAuthRoute) {
    return (
      <>
        <ToasterClient />
        {children}
      </>
    );
  }
    if (mobile) {
        return (
            <>
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
        <main className="w-full">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
