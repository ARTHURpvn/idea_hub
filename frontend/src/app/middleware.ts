import { validateToken } from "@/requests/auth";
import { getCookie } from "cookies-next/client";
import { NextRequest, NextResponse } from "next/server";
import { toast } from "sonner";

const middleware = (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    const token = getCookie("token");

    const publicRoutes = ["/login", "/register"]
    const isPublic: boolean = !publicRoutes.includes(pathname)

    if(!isPublic) {
        validateToken().then((res) => {
            if (!res.valid) {
                setTimeout(() => {
                    toast.warning("Token invalido, redirecionando para login");
                }, 1000)
            }
        });
        if (token) return;
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
};1