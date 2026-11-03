import { AdminSidebar } from "@/components/admin/sidebar";
import { requireStaff } from "@/lib/auth";
import { kk } from "@/lib/i18n/kk";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  return (
    <div className="min-h-dvh bg-slate-50/50 lg:flex">
      <AdminSidebar name={profile.full_name || profile.email || ""} role={kk.roles[profile.role]} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
