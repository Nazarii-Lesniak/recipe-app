"use client";

import { generateReactHelpers } from "@uploadthing/react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import type { OurFileRouter } from "@/shared/api/uploadthing";
import { compressImageToWebP } from "@/shared/lib/compress-image";
import { Button } from "@/shared/ui";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export function RecipeImageUploader({
  valueUrl,
  onChange,
}: {
  valueUrl: string | null | undefined;
  onChange: (next: { url: string | null; key: string | null }) => void;
}) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [compressing, setCompressing] = useState(false);

  const { startUpload, isUploading } = useUploadThing("recipeImage", {
    onClientUploadComplete: (files) => {
      const first = files[0];
      if (first) {
        onChange({ url: first.ufsUrl, key: first.key });
      }
    },
    onUploadError: () => {
      toast.error(tErrors("uploadFailed"));
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressImageToWebP(file);
      await startUpload([compressed]);
    } catch {
      toast.error(tErrors("uploadFailed"));
    } finally {
      setCompressing(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const busy = compressing || isUploading;

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      {valueUrl ? (
        <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-lg border border-border bg-muted">
          <Image src={valueUrl} alt="Recipe cover" fill className="object-cover" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => onChange({ url: null, key: null })}
            aria-label={tCommon("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-28 w-full max-w-md flex-col gap-2 border-dashed"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-xs">{busy ? t("uploadingPhoto") : t("uploadPhoto")}</span>
        </Button>
      )}
    </div>
  );
}
