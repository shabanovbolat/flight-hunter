"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/env";
import { kk } from "@/lib/i18n/kk";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Uploads to the public `quiz-media` bucket under `<uid>/…` (RLS-enforced). */
export function ImageUpload({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError(kk.upload.badType);
    if (file.size > 5 * 1024 * 1024) return setError(kk.upload.tooLarge);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("quiz-media")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) throw upErr;
      onChange(path);
    } catch {
      setError(kk.upload.failed);
    } finally {
      setBusy(false);
    }
  }

  const url = mediaUrl(value);
  return (
    <div className="space-y-2">
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {url ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <Image src={url} alt="" width={640} height={360} unoptimized className="max-h-56 w-full object-contain" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute right-2 top-2"
            onClick={() => onChange(null)}
          >
            <Trash2 /> {kk.upload.remove}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-gold-300 hover:bg-gold-50/40"
        >
          {busy ? <Spinner /> : <ImagePlus className="size-5 text-slate-400" />}
          {busy ? kk.upload.uploading : kk.upload.choose}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
