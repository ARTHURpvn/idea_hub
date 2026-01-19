"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    useSidebar,
} from "@/components/ui/sidebar"
import {Button} from "./ui/button"
import {Tooltip, TooltipTrigger, TooltipContent} from '@/components/ui/tooltip'
import {LayoutDashboardIcon, LightbulbIcon, LogOutIcon, PanelLeft, SettingsIcon, UserIcon} from "lucide-react"
import Image from "next/image"
import {useAuthStore} from "@/store/auth_store"
import {cn} from "@/lib/utils"
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AppSidebar() {
    const {toggleSidebar, open} = useSidebar()
    const route = usePathname()

    const {logout} = useAuthStore.getState()
    const name = useAuthStore((state) => state.name) || "User Name"
    const username = name.split(" ")[0] + " " + name.split(" ")[1]?.charAt(0).toUpperCase() + "."
    const email = useAuthStore((state) => state.email) || "User@gmail.com"

    const menuActions = [
        {
            name: "Dashboard",
            Icon: LayoutDashboardIcon,
            href: "/dashboard",
        },
        {
            name: "Ideas",
            Icon: LightbulbIcon,
            href: "/ideas",
        },
        // {
        //     name: "Configurações",
        //     Icon: SettingsIcon,
        //     href: "/settings",
        // }
    ]


    return (
        <Sidebar collapsible={"icon"} variant={"inset"}>
            <SidebarHeader className={"relative h-16 border-b border-border overflow-visible"}>
                <div
                    className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
                    <Image
                        src={open ? "/ideahub_logo.png" : "/ideahub_icon.png"}
                        alt={"ideahub icon"}
                        width={open ? 120 : 32}
                        height={20}
                        className={cn(
                            "object-contain transition-[width,opacity,transform] duration-150 ease-in-out",
                            open ? "w-[50%]" : "w-9"
                        )}
                        priority
                    />
                </div>
                <div
                    className={cn(
                        "absolute z-50 right-[-50px] overflow-visible pointer-events-auto",
                        open
                            ? " top-1/2 -translate-y-1/2"
                            : "-right-[100px] top-0 -translate-x-1/2 translate-y-1/2"
                    )}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={"ghost"}
                                size={"icon"}
                                aria-expanded={open}
                                className={cn(
                                    "transition-all duration-300 rounded-full p-2 flex items-center justify-center",
                                    "hover:scale-105",
                                    "shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2",
                                )}
                                aria-label={open ? "Fechar menu" : "Abrir menu"}
                                onClick={() => toggleSidebar()}
                            >
                                <PanelLeft size={18}
                                           className={cn("transition-transform duration-300", open ? "rotate-0" : "-rotate-180")}/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side={"right"}>
                            {open ? 'Fechar menu' : 'Abrir menu'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </SidebarHeader>
            <SidebarContent className={"flex flex-col mx-4"}>
                {menuActions.map((action, index) => (
                    <SidebarGroup key={index} title={action.name}>
                        <Button
                            variant={"aside"}
                            size={"lg"}
                            className={cn(
                                "relative w-full py-3 flex flex-row gap-3 items-center box-border px-2",
                                open ? "justify-start" : "justify-center",
                                route.startsWith(action.href) && "text-primary"
                            )}
                            asChild
                        >
                            <Link href={action.href}>

                                <span
                                    className={cn(
                                        open
                                            ? "flex items-center justify-center w-10 flex-shrink-0"
                                            : "absolute left-1/2 -translate-x-1/2 w-10 flex items-center justify-center z-10"
                                    )}
                                >
                                    <action.Icon strokeWidth={2} className={cn("size-5 text-current transition-[color,stroke]", route.startsWith(action.href) && "text-primary")}/>
                                </span>
                                <span
                                    className={cn(
                                        "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] transition-colors duration-300 text-lg md:block",
                                        open ? "max-w-[200px] opacity-100 ml-0" : "max-w-0 opacity-0"
                                    )}
                                >
                                    {action.name}
                                </span>
                            </Link>
                        </Button>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter className={
                cn("flex flex-row items-center border-t border-border py-4 mx-4 mt-auto", open ? "justify-between" : "justify-center"
                )}>
                <div className={cn("flex items-center", open ? "flex-row gap-4 mr-2" : "justify-center w-full")}>
                    <div className={"flex justify-center items-center size-10 bg-secondary rounded-md"}>
                        <UserIcon className={"text-current transition-[color,stroke] duration-300"} />
                    </div>
                    <div
                        className={cn("overflow-hidden transition-[max-width,opacity] duration-300", open ? "max-w-[120px] opacity-100 ml-2" : "max-w-0 opacity-0")}>
                        <p className={"text-sm font-medium"}>
                            {username}
                        </p>
                        <p className={"text-xs text-muted-foreground truncate overflow-hidden max-w-[90%]"}>
                            {email}
                        </p>
                    </div>
                </div>

                {open && (
                    <div className={`flex items-center gap-2 ${open ? "opacity-100" : "opacity-0"} duration-500`}>
                        <Button variant={"exit"} size={"icon"} onClick={logout}>
                            <LogOutIcon className={"text-destructive size-5 transition-[color,stroke] duration-300"}/>
                        </Button>
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    )
}
