import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/core/env";

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();

let cachedRedis: Redis | null = null;
const cachedLimiters = new Map<string, Ratelimit>();

function getRedisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!cachedRedis) {
    cachedRedis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return cachedRedis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkMemoryRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
  nowMs = Date.now(),
): RateLimitResult {
  const existing = memoryBuckets.get(bucketKey);
  if (!existing || nowMs >= existing.resetAt) {
    const resetAt = nowMs + windowSeconds * 1000;
    memoryBuckets.set(bucketKey, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export async function checkRateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (redis) {
    const cacheKey = `${namespace}:${limit}:${windowSeconds}`;
    let limiter = cachedLimiters.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `recipes:${namespace}`,
      });
      cachedLimiters.set(cacheKey, limiter);
    }

    try {
      const result = await limiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Fall back to in-memory limiter if Upstash is temporarily unreachable
    }
  }

  return checkMemoryRateLimit(`${namespace}:${identifier}`, limit, windowSeconds);
}
