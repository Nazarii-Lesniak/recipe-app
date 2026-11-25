import { describe, expect, it } from "vitest";
import { hasRequiredRole } from "../core/auth/session";
import { canViewRecipe } from "../entities/recipe/server/recipe-service";
import { checkMemoryRateLimit } from "../shared/api/rate-limit";

describe("RBAC and recipe visibility guards", () => {
  it("checks required roles accurately", () => {
    expect(hasRequiredRole("admin", ["moderator", "admin"])).toBe(true);
    expect(hasRequiredRole("moderator", ["moderator", "admin"])).toBe(true);
    expect(hasRequiredRole("user", ["moderator", "admin"])).toBe(false);
    expect(hasRequiredRole(null, ["user"])).toBe(false);
  });

  it("enforces visibility, draft, hidden moderation, and soft delete rules", () => {
    expect(
      canViewRecipe(
        {
          authorId: "u1",
          visibility: "public",
          status: "active",
          moderationStatus: "unreviewed",
          deletedAt: null,
        },
        null,
        null,
      ),
    ).toBe(true);

    expect(
      canViewRecipe(
        {
          authorId: "u1",
          visibility: "private",
          status: "active",
          moderationStatus: "approved",
          deletedAt: null,
        },
        "u2",
        "user",
      ),
    ).toBe(false);

    expect(
      canViewRecipe(
        {
          authorId: "u1",
          visibility: "public",
          status: "active",
          moderationStatus: "hidden",
          deletedAt: null,
        },
        "mod1",
        "moderator",
      ),
    ).toBe(true);

    expect(
      canViewRecipe(
        {
          authorId: "u1",
          visibility: "public",
          status: "active",
          moderationStatus: "approved",
          deletedAt: new Date(),
        },
        "u1",
        "user",
      ),
    ).toBe(false);

    expect(
      canViewRecipe(
        {
          authorId: "u1",
          visibility: "public",
          status: "active",
          moderationStatus: "approved",
          deletedAt: new Date(),
        },
        "admin1",
        "admin",
      ),
    ).toBe(true);
  });
});

describe("in-memory rate limit fallback", () => {
  it("enforces limit within the time window and resets after window", () => {
    const t0 = 1_000_000;
    const key = "test-auth-bucket";
    expect(checkMemoryRateLimit(key, 2, 60, t0).allowed).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 60, t0 + 1000).allowed).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 60, t0 + 2000).allowed).toBe(false);
    expect(checkMemoryRateLimit(key, 2, 60, t0 + 61_000).allowed).toBe(true);
  });
});
