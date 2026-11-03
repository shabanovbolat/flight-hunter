"use client";

import { useState, useTransition } from "react";
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
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={kk.common.confirmDelete}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">{kk.common.cancel}</Button>
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={() => start(async () => void (await onConfirm()))}>
            {kk.common.delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QuizStatusActions({ quizId, status }: { quizId: string; status: QuizStatus }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (s: QuizStatus) =>
    start(async () => {
      setError(null);
      const res = await setQuizStatus(quizId, s);
      if (!res.ok) setError(res.error);
    });

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
            if (res && !res.ok) setError(res.error);
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
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" disabled={pending || isFirst} aria-label={kk.question.moveUp} onClick={() => start(async () => void (await moveQuestion(questionId, -1, quizId)))}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending || isLast} aria-label={kk.question.moveDown} onClick={() => start(async () => void (await moveQuestion(questionId, 1, quizId)))}>
        <ArrowDown />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} aria-label={kk.question.duplicate} onClick={() => start(async () => void (await duplicateQuestion(questionId, quizId)))}>
        <Copy />
      </Button>
      <ConfirmDelete
        title={kk.common.delete}
        onConfirm={async () => void (await deleteQuestion(questionId, quizId))}
        trigger={
          <Button variant="ghost" size="icon" aria-label={kk.common.delete}>
            <Trash2 className="text-red-500" />
          </Button>
        }
      />
    </div>
  );
}
