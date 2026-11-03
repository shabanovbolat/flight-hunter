"use client";

import { useActionState, useEffect, useState } from "react";
import { reloadPage } from "@/lib/reload";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { changePassword, createCreator, setUserRole, updateProfile, type FormResult } from "@/lib/actions/settings";
import { createCategory, deleteCategory } from "@/lib/actions/quiz";
import type { ActionResult, UserRole } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

const s = kk.settings;

function Result({ state }: { state: FormResult }) {
  if (!state) return null;
  return state.ok ? <Alert variant="success">{state.data}</Alert> : <Alert>{state.error}</Alert>;
}

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label={s.fullName} htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={fullName} minLength={2} maxLength={120} required />
      </Field>
      <Result state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? kk.common.saving : kk.common.save}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label={s.newPassword} htmlFor="password" hint={s.passwordHint}>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </Field>
      <Result state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {s.changePassword}
      </Button>
    </form>
  );
}

export function CategoriesForm({ categories }: { categories: { id: string; name: string; mine: boolean }[] }) {
  const [state, action, pending] = useActionState<ActionResult<{ id: string; name: string }> | undefined, FormData>(
    createCategory,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) reloadPage();
  }, [state]);
  return (
    <div className="space-y-4">
      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">{s.noCategories}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              {c.name}
              {c.mine && (
                <Button variant="ghost" size="icon" aria-label={kk.common.delete} onClick={async () => {
                  await deleteCategory(c.id);
                  reloadPage();
                }}>
                  <Trash2 className="text-slate-400" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder={s.categoryName} required maxLength={80} aria-label={s.categoryName} />
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus /> {s.addCategory}
        </Button>
      </form>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
    </div>
  );
}

export function CreatorForm() {
  const [state, action, pending] = useActionState(createCreator, undefined);
  useEffect(() => {
    // keep the success message visible briefly, then show the new user in the list
    if (state?.ok) setTimeout(reloadPage, 1200);
  }, [state]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label={s.fullName} htmlFor="c-name">
        <Input id="c-name" name="full_name" required minLength={2} maxLength={120} />
      </Field>
      <Field label={s.email} htmlFor="c-email">
        <Input id="c-email" name="email" type="email" required />
      </Field>
      <Field label={s.password} htmlFor="c-pass" hint={s.passwordHint}>
        <Input id="c-pass" name="password" type="text" minLength={8} required autoComplete="off" />
      </Field>
      <div className="sm:col-span-3 space-y-3">
        <Result state={state} />
        <Button type="submit" variant="gold" disabled={pending}>
          <Plus /> {s.createCreator}
        </Button>
      </div>
    </form>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: UserRole; disabled?: boolean }) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        value={value}
        disabled={disabled || pending}
        aria-label={s.changeRole}
        className="h-9 w-40 text-sm"
        onChange={async (e) => {
          const next = e.target.value as UserRole;
          setValue(next);
          setPending(true);
          const res = await setUserRole(userId, next);
          setPending(false);
          if (!res.ok) {
            setError(res.error);
            setValue(role);
          } else setError(null);
        }}
      >
        {(["super_admin", "creator", "pending"] as const).map((r) => (
          <option key={r} value={r}>
            {kk.roles[r]}
          </option>
        ))}
      </Select>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
