import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Simple in-memory cache for token validation (valid for 30 seconds)
const tokenCache = new Map<string, { valid: boolean; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

// Validate token by calling backend
async function isTokenValid(token: string): Promise<boolean> {
    // Check cache first
    const cached = tokenCache.get(token);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.valid;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/token`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const isValid = response.ok;

        if (isValid) {
            const data = await response.json();
            const valid = data.validated === true;

            // Cache the result
            tokenCache.set(token, { valid, timestamp: Date.now() });

            // Clean old cache entries (prevent memory leak)
            if (tokenCache.size > 100) {
                const oldestKey = tokenCache.keys().next().value;
                tokenCache.delete(oldestKey);
            }

            return valid;
        }

        // Invalid token - cache as invalid
        tokenCache.set(token, { valid: false, timestamp: Date.now() });
        return false;
    } catch (error) {
        console.error("Error validating token:", error);
        return false;
    }
}

const proxy = async (req: NextRequest) => {
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
    const isHomePage = pathname === "/";
    const isPublicRoute = isAuthRoute || isHomePage;
    const isProtected: boolean = !isPublicRoute;

    if (isProtected) {
        // Check if token exists
        if (!token) {
            const url = new URL("/auth/login", req.url);
            url.searchParams.set("reason", "auth_required");
            return NextResponse.redirect(url);
        }

        // Validate token with backend
        const tokenIsValid = await isTokenValid(token);

        if (!tokenIsValid) {
            // Token is invalid or expired - clear cookie and redirect to login
            const url = new URL("/auth/login", req.url);
            url.searchParams.set("reason", "token_expired");

            const response = NextResponse.redirect(url);
            response.cookies.delete("token");
            return response;
        }

        // Token is valid, proceed
        return NextResponse.next();
    }

    return NextResponse.next();
};

export default proxy;