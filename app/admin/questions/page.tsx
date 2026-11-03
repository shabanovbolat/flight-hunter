import Link from "next/link";
import { LibraryBig, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { questionTypeSchema } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const term = (sp.q ?? "").trim().slice(0, 100);
  const type = questionTypeSchema.safeParse(sp.type);
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("id, quiz_id, type, text, arabic_text, points, reference_type, quizzes(title)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (term) query = query.or(`text.ilike.%${term.replace(/[%,()]/g, " ")}%,arabic_text.ilike.%${term.replace(/[%,()]/g, " ")}%`);
  if (type.success) query = query.eq("type", type.data);
  const { data, error } = await query;

  return (
    <>
      <PageHeader title={kk.question.bankTitle} description={kk.question.bankSubtitle} />
      <form className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={term} placeholder={kk.common.search} className="sm:max-w-sm" />
        <Select name="type" defaultValue={type.success ? type.data : ""} className="sm:max-w-52">
          <option value="">{kk.common.all}</option>
          {(["single", "multiple", "true_false", "text"] as const).map((t) => (
            <option key={t} value={t}>
              {kk.question.types[t]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          <Search /> {kk.common.search}
        </Button>
      </form>
      {error ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={<LibraryBig className="size-6" />} title={kk.question.empty} />
      ) : (
        <div className="grid gap-2">
          {data.map((q) => (
            <Link key={q.id} href={`/admin/quizzes/${q.quiz_id}/questions/${q.id}`}>
              <Card className="space-y-1.5 p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{kk.question.types[q.type]}</Badge>
                  <Badge variant="gold">
                    {q.points} {kk.common.points}
                  </Badge>
                  {q.reference_type ? <Badge>{kk.question.fields.referenceTypes[q.reference_type]}</Badge> : null}
                  <span className="truncate text-xs text-slate-500">{q.quizzes?.title}</span>
                </div>
                <p className="text-sm font-medium">{q.text}</p>
                {q.arabic_text ? (
                  <p dir="rtl" lang="ar" className="font-arabic truncate text-lg leading-loose">
                    {q.arabic_text}
                  </p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
