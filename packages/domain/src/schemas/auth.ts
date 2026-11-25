import { z } from "zod";
import { SUPPORTED_LOCALES, SUPPORTED_THEMES, UNIT_SYSTEMS } from "../constants";

export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "username_too_short")
  .max(30, "username_too_long")
  .regex(USERNAME_REGEX, "username_invalid_chars");

export const passwordSchema = z
  .string()
  .min(8, "password_too_short")
  .max(128, "password_too_long");

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "confirm_password_required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords_do_not_match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "password_required"),
});

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(1).max(60).optional(),
  preferredLocale: z.enum(SUPPORTED_LOCALES).optional(),
  preferredTheme: z.enum(SUPPORTED_THEMES).optional(),
  preferredUnits: z.enum(UNIT_SYSTEMS).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function buildInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@local.internal`;
}

export function generateUsernameCandidate(name: string, suffix?: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_")
    .replace(/^[_.]|[_.]$/g, "");

  const base = cleaned.length >= 3 ? cleaned : `chef_${cleaned || "user"}`;
  const suffixPart = suffix ? `_${suffix.replace(/[^a-z0-9]/gi, "").toLowerCase()}` : "";
  const maxBaseLength = Math.max(3, 30 - suffixPart.length);
  return `${base.slice(0, maxBaseLength)}${suffixPart}`.slice(0, 30);
}
