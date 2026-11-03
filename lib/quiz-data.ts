import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/schemas";

/** Loads a quiz the current admin may access (RLS) or 404s. */
export const getOwnedQuiz = cache(async (id: string) => {
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data;
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("quiz_categories").select("id, name").order("name");
  return data ?? [];
});
