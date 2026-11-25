import { describe, expect, it } from "vitest";
import { AuthError } from "../core/auth/session";
import { assertCanMutateRecipe } from "../entities/recipe/server/recipe-mutations";
import { validateImageFile } from "../shared/lib/compress-image";

describe("image validation before WebP compression", () => {
  it("accepts JPEG, PNG, WebP, AVIF up to 5 MB", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1_000_000 })).toEqual({ ok: true });
    expect(validateImageFile({ type: "image/webp", size: 5 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it("rejects unsupported MIME types and oversized files", () => {
    expect(validateImageFile({ type: "image/gif", size: 1000 })).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
    expect(validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 })).toEqual({
      ok: false,
      reason: "file_too_large",
    });
  });
});

describe("recipe mutation ownership enforcement", () => {
  it("allows author or admin, rejects non-author user", () => {
    expect(() => assertCanMutateRecipe("u1", "u1", "user")).not.toThrow();
    expect(() => assertCanMutateRecipe("u1", "admin1", "admin")).not.toThrow();
    expect(() => assertCanMutateRecipe("u1", "u2", "user")).toThrow(AuthError);
    expect(() => assertCanMutateRecipe("u1", "mod1", "moderator")).toThrow(AuthError);
  });
});
