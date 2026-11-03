"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Landing } from "@/components/quiz/landing";
import { SelfPlayer } from "@/components/quiz/self-player";
import { LivePlayer } from "@/components/quiz/live-player";
import { ResultView } from "@/components/quiz/result-view";
import type { PublicQuiz } from "@/lib/types";

type View =
  | { kind: "landing" }
  | { kind: "self"; participantId: string }
  | { kind: "live"; participantId: string; sessionId: string }
  | { kind: "result"; participantId: string; sessionId: string | null };

function initialView(quiz: PublicQuiz): View {
  const me = quiz.my_participant;
  const live = quiz.live_session;
  if (live) {
    if (me && me.session_id === live.id) {
      return me.status === "completed"
        ? { kind: "result", participantId: me.id, sessionId: live.id }
        : { kind: "live", participantId: me.id, sessionId: live.id };
    }
    return { kind: "landing" };
  }
  if (me) {
    // refresh resumes an attempt that is still running
    if (me.status === "in_progress" && !me.session_id) return { kind: "self", participantId: me.id };
    if (me.status === "completed") return { kind: "result", participantId: me.id, sessionId: me.session_id };
  }
  return { kind: "landing" };
}

export function QuizPlayer({ quiz }: { quiz: PublicQuiz }) {
  const router = useRouter();
  const [view, setView] = useState<View>(() => initialView(quiz));

  const finish = useCallback(
    (participantId: string, sessionId: string | null) => setView({ kind: "result", participantId, sessionId }),
    [],
  );

  switch (view.kind) {
    case "landing":
      return (
        <Landing
          quiz={quiz}
          onJoined={(participantId, sessionId) =>
            setView(sessionId ? { kind: "live", participantId, sessionId } : { kind: "self", participantId })
          }
        />
      );
    case "self":
      return <SelfPlayer participantId={view.participantId} onFinished={() => finish(view.participantId, null)} />;
    case "live":
      return (
        <LivePlayer
          participantId={view.participantId}
          sessionId={view.sessionId}
          onFinished={() => finish(view.participantId, view.sessionId)}
        />
      );
    case "result":
      return (
        <ResultView
          participantId={view.participantId}
          sessionId={view.sessionId}
          onRetry={() => {
            setView({ kind: "landing" });
            router.refresh();
          }}
        />
      );
  }
}
