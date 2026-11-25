import { ACCEPTED_IMAGE_MIME_TYPES, RECIPE_LIMITS } from "@recipes/domain";

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; reason: "unsupported_type" | "file_too_large" };

export function validateImageFile(file: { type: string; size: number }): ImageValidationResult {
  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number])) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (file.size <= 0 || file.size > RECIPE_LIMITS.maxImageBytes) {
    return { ok: false, reason: "file_too_large" };
  }
  return { ok: true };
}

export async function compressImageToWebP(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
): Promise<File> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/webp", quality);
    });

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "recipe-photo";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
