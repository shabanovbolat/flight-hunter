"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creatorSchema, passwordSchema, profileSchema, roleSchema } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { rpcErrorMessage } from "@/lib/rpc";
import type { ActionResult } from "@/lib/types";

export type FormResult = ActionResult<string> | undefined;

export async function updateProfile(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const profile = await requireStaff();
  const parsed = profileSchema.safeParse({ full_name: formData.get("full_name") });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", profile.id);
  if (error) return { ok: false, error: kk.common.unknownError };
  revalidatePath("/admin", "layout");
  return { ok: true, data: kk.common.saved };
}

export async function changePassword(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireStaff();
  const parsed = passwordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: kk.settings.passwordHint };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: kk.common.unknownError };
  return { ok: true, data: kk.settings.passwordChanged };
}

/** Super admin only. Uses the service role (server-side) to create a confirmed creator account. */
export async function createCreator(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireSuperAdmin();
  const parsed = creatorSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: kk.settings.serviceKeyMissing };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
    app_metadata: { role: "creator" },
  });
  if (error) {
    return { ok: false, error: /already|exists|registered/i.test(error.message) ? kk.settings.userExists : kk.common.unknownError };
  }
  revalidatePath("/admin/settings");
  return { ok: true, data: kk.settings.creatorCreated };
}

export async function setUserRole(userId: string, role: "super_admin" | "creator" | "pending"): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = roleSchema.safeParse({ userId, role });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  revalidatePath("/admin/settings");
  return { ok: true, data: undefined };
}
