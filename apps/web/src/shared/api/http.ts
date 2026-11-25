import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/core/auth/session";
import { env } from "@/core/env";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Authentication required"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function tooManyRequests(resetAt?: number): NextResponse {
  const retryAfter = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : 60;
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("host");
  const allowedOrigins = new Set<string>();
  if (host) {
    allowedOrigins.add(`http://${host}`);
    allowedOrigins.add(`https://${host}`);
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.add(new URL(env.NEXT_PUBLIC_APP_URL).origin);
  }
  if (env.BETTER_AUTH_URL) {
    allowedOrigins.add(new URL(env.BETTER_AUTH_URL).origin);
  }

  return allowedOrigins.has(origin);
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 },
    );
  }
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Unhandled API route error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
