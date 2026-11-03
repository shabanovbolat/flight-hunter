"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { signIn, type LoginState } from "@/lib/actions/auth";
import { kk } from "@/lib/i18n/kk";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label={kk.auth.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={kk.auth.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      {state?.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? kk.auth.signingIn : kk.auth.signIn}
      </Button>
    </form>
  );
}
