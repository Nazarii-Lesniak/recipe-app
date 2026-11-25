import * as schema from "@recipes/db/schema";
import { getDb } from "@recipes/db";
import { generateUsernameCandidate, normalizeUsername } from "@recipes/domain";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { env } from "@/core/env";

const googleConfig =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET ?? "recipes-app-local-dev-secret-change-me-32",
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: googleConfig,
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: ["user", "moderator", "admin"],
        required: false,
        defaultValue: "user",
        input: false,
      },
      preferredLocale: {
        type: ["uk", "en"],
        required: false,
        defaultValue: "uk",
      },
      preferredTheme: {
        type: ["warm-kitchen", "dark-espresso", "fresh-matcha", "system"],
        required: false,
        defaultValue: "warm-kitchen",
      },
      preferredUnits: {
        type: ["metric", "imperial"],
        required: false,
        defaultValue: "metric",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const existingUsername =
            typeof (user as Record<string, unknown>).username === "string"
              ? ((user as Record<string, unknown>).username as string)
              : null;

          if (existingUsername && existingUsername.trim().length >= 3) {
            const normalized = normalizeUsername(existingUsername);
            return {
              data: {
                ...user,
                username: normalized,
                displayUsername:
                  typeof (user as Record<string, unknown>).displayUsername === "string"
                    ? ((user as Record<string, unknown>).displayUsername as string)
                    : existingUsername.trim(),
              },
            };
          }

          const suffix = Math.random().toString(36).slice(2, 6);
          const candidate = generateUsernameCandidate(user.name || "chef", suffix);
          return {
            data: {
              ...user,
              username: candidate,
              displayUsername: candidate,
              displayName: user.name || candidate,
            },
          };
        },
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
