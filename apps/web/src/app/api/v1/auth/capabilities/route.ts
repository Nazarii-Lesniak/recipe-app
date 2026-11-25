import { env } from "@/core/env";
import { ok } from "@/shared/api/http";

export async function GET() {
  return ok({
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  });
}
