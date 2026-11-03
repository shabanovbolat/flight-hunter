import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { qrPng, quizUrl } from "@/lib/qr";
import { uuid } from "@/lib/validation/schemas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  // RLS: only the owner (or super admin) sees the row
  const { data: quiz } = await supabase.from("quizzes").select("slug").eq("id", id).maybeSingle();
  if (!quiz) return new NextResponse(null, { status: 404 });
  const png = await qrPng(quizUrl(quiz.slug), 1200);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="ilim-quiz-${quiz.slug}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
