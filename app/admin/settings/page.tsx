import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoriesForm, CreatorForm, PasswordForm, ProfileForm, RoleSelect } from "@/components/admin/settings-forms";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kk } from "@/lib/i18n/kk";

export default async function SettingsPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const isSuper = profile.role === "super_admin";
  const [{ data: categories }, { data: users }] = await Promise.all([
    supabase.from("quiz_categories").select("id, name, created_by").order("name"),
    isSuper
      ? supabase.from("profiles").select("id, email, full_name, role").order("created_at")
      : Promise.resolve({ data: null }),
  ]);
  const s = kk.settings;

  return (
    <>
      <PageHeader title={s.title} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{s.profile}</CardTitle>
            <CardDescription>
              {profile.email} · <Badge variant="gold">{kk.roles[profile.role]}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileForm fullName={profile.full_name ?? ""} />
            <div className="border-t border-slate-100 pt-5">
              <PasswordForm />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{s.categories}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriesForm
              categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name, mine: isSuper || c.created_by === profile.id }))}
            />
          </CardContent>
        </Card>
        {isSuper && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{s.users}</CardTitle>
              <CardDescription>{s.usersHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="divide-y divide-slate-100">
                {(users ?? []).map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.full_name || u.email}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                    <RoleSelect userId={u.id} role={u.role} disabled={u.id === profile.id} />
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-5">
                <CreatorForm />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
