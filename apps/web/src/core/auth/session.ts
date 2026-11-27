import { isDatabaseConfigured } from "@recipes/db";
import type { Locale, ThemePreference, UnitSystem, UserRole } from "@recipes/domain";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  displayName: string | null;
  image: string | null;
  role: UserRole;
  preferredLocale: Locale;
  preferredTheme: ThemePreference;
  preferredUnits: UnitSystem;
}

export function hasRequiredRole(
  userRole: UserRole | undefined | null,
  allowedRoles: readonly UserRole[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export const getServerSession = cache(async (): Promise<{ user: SessionUser } | null> => {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const headerStore = await headers();
    const cookieHeader = headerStore.get("cookie") ?? "";
    if (!cookieHeader.includes("better-auth")) {
      return null;
    }

    const session = await auth.api.getSession({
      headers: headerStore,
    });
    if (!session?.user) {
      return null;
    }

    const raw = session.user as Record<string, unknown>;
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        username: typeof raw.username === "string" ? raw.username : session.user.name,
        displayName: typeof raw.displayName === "string" ? raw.displayName : null,
        image: session.user.image ?? null,
        role: (raw.role as UserRole | undefined) ?? "user",
        preferredLocale: (raw.preferredLocale as Locale | undefined) ?? "uk",
        preferredTheme: (raw.preferredTheme as ThemePreference | undefined) ?? "warm-kitchen",
        preferredUnits: (raw.preferredUnits as UnitSystem | undefined) ?? "metric",
      },
    };
  } catch {
    return null;
  }
});

export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) {
    throw new AuthError("Authentication required", 401);
  }
  return session.user;
}

export async function requireRole(allowedRoles: readonly UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasRequiredRole(user.role, allowedRoles)) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
