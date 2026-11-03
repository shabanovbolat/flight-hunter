import { Badge } from "@/components/ui/badge";
import type { QuizStatus } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

export function StatusBadge({ status }: { status: QuizStatus }) {
  const variant = status === "published" ? "success" : status === "archived" ? "default" : "gold";
  return <Badge variant={variant}>{kk.quiz.status[status]}</Badge>;
}
