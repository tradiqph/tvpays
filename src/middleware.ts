import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";
import {
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";

const RATE_LIMITED_POST: { path: string; max: number; windowMs: number }[] = [
  { path: "/api/auth/login", max: 20, windowMs: 60_000 },
  { path: "/api/auth/forgot-password", max: 10, windowMs: 60_000 },
  { path: "/api/wallet/withdraw", max: 15, windowMs: 60_000 },
  { path: "/api/wallet/transfer", max: 30, windowMs: 60_000 },
  { path: "/api/hq/members", max: 30, windowMs: 60_000 },
  { path: "/api/starpago/deposits", max: 20, windowMs: 60_000 },
  { path: "/api/economy/drama-episode", max: 120, windowMs: 60_000 },
  { path: "/api/economy/checkin", max: 10, windowMs: 60_000 },
];

function withHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (request.method === "POST") {
    const rule = RATE_LIMITED_POST.find(
      (r) => path === r.path || path.startsWith(`${r.path}/`),
    );
    if (rule) {
      const ip = clientIpFromHeaders(request.headers);
      const rl = checkRateLimit(`${rule.path}:${ip}`, rule.max, rule.windowMs);
      if (!rl.ok) {
        return withHeaders(
          NextResponse.json(
            { error: "Too many requests. Please wait and try again." },
            {
              status: 429,
              headers: { "Retry-After": String(rl.retryAfterSec) },
            },
          ),
        );
      }
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPublic =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isHq = path.startsWith("/hq");
  const isApi = path.startsWith("/api");

  if (isApi || isAuthCallback) return withHeaders(supabaseResponse);

  if (isHq) {
    const role = user?.app_metadata?.role;
    if (!user || (role !== "hq" && role !== "super_admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return withHeaders(NextResponse.redirect(url));
    }
    return withHeaders(supabaseResponse);
  }

  if (!user && !isAuthPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withHeaders(NextResponse.redirect(url));
  }

  if (user && isAuthPublic && !path.startsWith("/reset-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/wallet";
    return withHeaders(NextResponse.redirect(url));
  }

  return withHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb)$).*)",
  ],
};
