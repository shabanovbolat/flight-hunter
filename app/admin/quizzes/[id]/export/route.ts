import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadQuizResults } from "@/lib/results";
import { toCsv, toXlsx, type QuestionStat } from "@/lib/export";

const query = z.object({
  format: z.enum(["csv", "xlsx"]),
  session: z.union([z.literal("all"), z.literal("self"), z.string().uuid()]).default("all"),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = query.safeParse({
    format: req.nextUrl.searchParams.get("format"),
    session: req.nextUrl.searchParams.get("session") ?? undefined,
  });
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("slug").eq("id", id).maybeSingle();
  if (!quiz) return new NextResponse(null, { status: 404 });
  const rows = await loadQuizResults(id, parsed.data.session);
  if (!rows) return new NextResponse(null, { status: 500 });

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `ilim-quiz-${quiz.slug}-${stamp}`;
  if (parsed.data.format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const { data: stats } = await supabase.rpc("admin_quiz_statistics", { p_quiz_id: id });
  const questions = ((stats as { questions?: QuestionStat[] } | null)?.questions ?? []) as QuestionStat[];
  return new NextResponse(new Uint8Array(toXlsx(rows, questions)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
