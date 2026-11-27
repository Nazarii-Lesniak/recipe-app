import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { getServerSession } from "@/core/auth/session";
import { env } from "@/core/env";

const f = createUploadthing();

export const ourFileRouter = {
  recipeImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) {
        throw new Error("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

let cachedUtApi: UTApi | null = null;

export function isUploadThingConfigured(): boolean {
  return Boolean(env.UPLOADTHING_TOKEN);
}

export function getUtApi(): UTApi | null {
  if (!env.UPLOADTHING_TOKEN) {
    return null;
  }
  if (!cachedUtApi) {
    cachedUtApi = new UTApi({ token: env.UPLOADTHING_TOKEN });
  }
  return cachedUtApi;
}

export async function deleteUploadThingFiles(
  keys: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const validKeys = keys.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  if (validKeys.length === 0) {
    return;
  }
  const utapi = getUtApi();
  if (!utapi) {
    return;
  }
  try {
    await utapi.deleteFiles(validKeys);
  } catch (error) {
    console.error("Failed to delete UploadThing files:", error);
  }
}
