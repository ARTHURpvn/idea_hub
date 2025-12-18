import { LayoutDashboardIcon, LightbulbIcon, SettingsIcon } from "lucide-react"
import { Button } from "./ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

const MenuMobile = () => {
    const route = usePathname()

    const menuActions = [
        {
            name: "Ideas",
            Icon: LightbulbIcon,
            href: "/ideas",
        },
        {
            name: "Dashboard",
            Icon: LayoutDashboardIcon,
            href: "/dashboard",
        },
        // {
        //     name: "Configurações",
        //     Icon: SettingsIcon,
        //     href: "/settings",
        // }
    ]


    return(
        <nav className={"fixed bottom-0 left-0 w-full bg-sidebar z-50 border-t shadow-md flex items-center justify-center"}>
            <ul className={"flex gap-8 py-2"}>
                {menuActions.map((item, index)=> (
                    <li key={index}>
                        <Button variant={"ghost"} className={`size-14 ${route === item.href && 'text-blue-500'}`} asChild>
                            <Link href={item.href}>
                                <item.Icon className={"size-8"} strokeWidth={1}/>
                            </Link>
                        </Button>
                    </li>
                ))}

            </ul>
        </nav>
    )
}

export default MenuMobile