import { NextRequest, NextResponse } from "next/server";

const proxy = (req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get("token")?.value;

    // Paths that should always be allowed (assets, api, next internals, public files)
    const ignoredPrefixes = ["/_next", "/static", "/assets", "/public", "/api", "/favicon.ico", "/robots.txt", "/manifest.json"];
    if (ignoredPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Only treat navigation requests (HTML) for redirects — do not redirect assets or API calls
    const accept = req.headers.get('accept') || '';
    const isHtmlRequest = req.method === 'GET' && accept.includes('text/html');
    if (!isHtmlRequest) {
        return NextResponse.next();
    }

    const isAuthRoute = pathname.startsWith("/auth");
    const isProtected: boolean = !isAuthRoute;

    if (isProtected) {
        if (token) return NextResponse.next();

        // no token — redirect to login
        const url = new URL("/auth/login", req.url);
        url.searchParams.set("reason", "auth_required");
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
};

export default proxy;