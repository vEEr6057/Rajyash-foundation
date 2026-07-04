"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import imageCompression from "browser-image-compression";
import { Upload, Check, Loader2 } from "lucide-react";
import { requestPhotoUpload } from "@/features/pickups/actions/pickupActions";
import { cn } from "@/lib/utils";

/**
 * Compresses an image client-side, requests a signed upload URL (server action),
 * PUTs directly to Supabase Storage, and reports the stored object path.
 */
export function PhotoUploader({
  kind,
  label,
  onUploaded,
}: {
  kind: "food" | "proof";
  label: string;
  onUploaded: (path: string) => void;
}) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setState("working");
    setError(null);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const prep = await requestPhotoUpload(kind);
      if (!prep.ok) throw new Error(prep.message);
      const put = await fetch(prep.signedUrl, {
        method: "PUT",
        body: compressed,
        headers: { "content-type": "image/jpeg" },
      });
      if (!put.ok) throw new Error(t("photo.failedRetry"));
      onUploaded(prep.path);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("photo.failed"));
      setState("error");
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "working"}
        className={cn(
          "rj-press inline-flex h-11 items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold",
          state === "done" && "border-leaf text-leaf",
        )}
      >
        {state === "working" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="size-4" />
        ) : (
          <Upload className="size-4" />
        )}
        {state === "done" ? t("photo.added") : state === "working" ? t("photo.uploading") : label}
      </button>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
