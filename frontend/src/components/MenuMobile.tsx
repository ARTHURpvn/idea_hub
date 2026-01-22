"use client"

import { LayoutDashboardIcon, LightbulbIcon, User, LogOut, Sparkles, MessageSquare } from "lucide-react"
import { Button } from "./ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuthStore } from "@/store/auth_store"
import { useIdeaStore } from "@/store/idea_store"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { motion, AnimatePresence } from "framer-motion"

const MenuMobile = () => {
    const route = usePathname()
    const { logout, name, email } = useAuthStore()
    const [openProfile, setOpenProfile] = useState(false)

    // Get counts for badges
    const ideaProgress = useIdeaStore((state) => state.ideaProgress) || 0;

    const menuActions = [
        {
            name: "Dashboard",
            Icon: LayoutDashboardIcon,
            href: "/dashboard",
            badge: null,
        },
        {
            name: "Ideias",
            Icon: LightbulbIcon,
            href: "/ideas",
            badge: null,
        },
        // {
        //     name: "Feedback",
        //     Icon: MessageSquare,
        //     href: "/feedback",
        //     badge: null,
        // },
    ]

    const handleLogout = () => {
        setOpenProfile(false)
        logout()
    }

    return(
        <nav className={"fixed bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-xl z-50 border-t border-border/50 shadow-2xl"}>
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />

            <ul className={"flex justify-around items-center py-3 px-4 relative"}>
                {menuActions.map((item, index)=> {
                    const isActive = route.startsWith(item.href);

                    return (
                        <li key={index} className="relative">
                            <Link href={item.href}>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "relative flex flex-col items-center gap-1 h-auto py-2 px-4 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary scale-105"
                                            : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="relative">
                                        <item.Icon
                                            className={cn(
                                                "size-6 transition-all duration-200",
                                                isActive ? "scale-110" : ""
                                            )}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        {item.badge && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1"
                                            >
                                                <div className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-lg">
                                                    {item.badge}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium transition-all duration-200",
                                        isActive ? "opacity-100" : "opacity-60"
                                    )}>
                                        {item.name}
                                    </span>

                                    {/* Active indicator */}
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: "70%", opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                className="absolute -bottom-0.5 h-0.5 bg-primary rounded-full"
                                            />
                                        )}
                                    </AnimatePresence>
                                </Button>
                            </Link>
                        </li>
                    );
                })}

                {/* Perfil com Dialog */}
                <li>
                    <Dialog open={openProfile} onOpenChange={setOpenProfile}>
                        <DialogTrigger asChild>
                            <Button
                                variant={"ghost"}
                                className={cn(
                                    "relative flex flex-col items-center gap-1 h-auto py-2 px-4 rounded-xl transition-all duration-200",
                                    "hover:bg-muted/50"
                                )}
                            >
                                <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                                    <User className={"size-5"} strokeWidth={2}/>
                                </div>
                                <span className="text-[10px] font-medium opacity-60">
                                    Perfil
                                </span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm mx-4 rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    Meu Perfil
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-3 p-4 bg-gradient-to-br from-muted/50 to-background rounded-xl border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{name || "Usuário"}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {email || "email@example.com"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleLogout}
                                    variant="destructive"
                                    className="w-full gap-2 h-11 rounded-xl"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sair da Conta
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </li>
            </ul>
        </nav>
    )
}

export default MenuMobile