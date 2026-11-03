import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="tabular text-3xl font-bold tracking-tight text-navy-950">{value}</p>
          {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-xl", accent ? "bg-gold-100 text-gold-700" : "bg-navy-50 text-navy-700")}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
