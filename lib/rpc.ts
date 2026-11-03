import type { PostgrestError } from "@supabase/supabase-js";
import { errorMessage } from "@/lib/i18n/kk";

/** Maps a Postgres `raise exception '<code>'` to a Kazakh message. */
export function rpcErrorMessage(error: PostgrestError | Error | null | undefined): string {
  if (!error) return errorMessage(null);
  const msg = (error as PostgrestError).message ?? "";
  return errorMessage(msg.trim());
}
