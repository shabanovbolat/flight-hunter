import Link from "next/link";
import { Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { CopyButton } from "@/components/admin/copy-button";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { qrSvg, quizUrl } from "@/lib/qr";
import { kk } from "@/lib/i18n/kk";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  const url = quizUrl(quiz.slug);
  const svg = await qrSvg(url);
  const published = quiz.status === "published";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card className="p-6">
        <div className="mx-auto aspect-square w-full max-w-72 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 text-center text-xs text-slate-500">{kk.share.scanHint}</p>
      </Card>
      <div className="space-y-4">
        {!published ? <Alert variant="info">{kk.share.notPublished}</Alert> : null}
        {quiz.pin_hash ? <Alert variant="info">{kk.share.pinRequired}</Alert> : null}
        <Card>
          <CardContent className="space-y-3 pt-5 sm:pt-6">
            <p className="text-sm font-medium">{kk.share.link}</p>
            <p className="break-all rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-sm">{url}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={url} />
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink /> {kk.common.open}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/admin/quizzes/${quiz.id}/qr.png`} download>
              <Download /> {kk.share.downloadPng}
            </a>
          </Button>
          <Button asChild variant="gold">
            <Link href={`/admin/quizzes/${quiz.id}/poster`}>
              <Printer /> {kk.share.poster}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
