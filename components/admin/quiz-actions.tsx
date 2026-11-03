"use client";

import { useState } from "react";
import { reloadPage } from "@/lib/reload";
import { Archive, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { deleteQuiz, setQuizStatus } from "@/lib/actions/quiz";
import { deleteQuestion, duplicateQuestion, moveQuestion } from "@/lib/actions/question";
import type { QuizStatus } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

export function ConfirmDelete({
  title,
  onConfirm,
  trigger,
}: {
  title: string;
  onConfirm: () => Promise<void> | void;
  trigger: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={kk.common.confirmDelete}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">{kk.common.cancel}</Button>
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
              } finally {
                setPending(false);
              }
            }}>
            {kk.common.delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QuizStatusActions({ quizId, status }: { quizId: string; status: QuizStatus }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (s: QuizStatus) => {
    setPending(true);
    setError(null);
    const res = await setQuizStatus(quizId, s);
    if (!res.ok) {
      setPending(false);
      setError(res.error);
    } else reloadPage();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "published" ? (
          <Button variant="gold" disabled={pending} onClick={() => run("published")}>
            <Eye /> {kk.quiz.publish}
          </Button>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => run("draft")}>
            <EyeOff /> {kk.quiz.unpublish}
          </Button>
        )}
        {status !== "archived" && (
          <Button variant="outline" disabled={pending} onClick={() => run("archived")}>
            <Archive /> {kk.quiz.archive}
          </Button>
        )}
        <ConfirmDelete
          title={kk.quiz.deleteQuiz}
          onConfirm={async () => {
            const res = await deleteQuiz(quizId);
            if (!res.ok) setError(res.error);
            else window.location.assign("/admin/quizzes");
          }}
          trigger={
            <Button variant="ghost" size="icon" aria-label={kk.quiz.deleteQuiz}>
              <Trash2 className="text-red-500" />
            </Button>
          }
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function QuestionRowActions({
  questionId,
  quizId,
  isFirst,
  isLast,
}: {
  questionId: string;
  quizId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, setPending] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setPending(true);
    await fn();
    reloadPage();
  };
  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" disabled={pending || isFirst} aria-label={kk.question.moveUp} onClick={() => run(() => moveQuestion(questionId, -1, quizId))}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending || isLast} aria-label={kk.question.moveDown} onClick={() => run(() => moveQuestion(questionId, 1, quizId))}>
        <ArrowDown />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} aria-label={kk.question.duplicate} onClick={() => run(() => duplicateQuestion(questionId, quizId))}>
        <Copy />
      </Button>
      <ConfirmDelete
        title={kk.common.delete}
        onConfirm={() => run(() => deleteQuestion(questionId, quizId))}
        trigger={
          <Button variant="ghost" size="icon" aria-label={kk.common.delete}>
            <Trash2 className="text-red-500" />
          </Button>
        }
      />
    </div>
  );
}
