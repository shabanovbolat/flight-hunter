import { LogoMark } from "@/components/ui/logo";
import { PrintButton } from "@/components/admin/copy-button";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { qrSvg, quizUrl } from "@/lib/qr";
import { kk } from "@/lib/i18n/kk";

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  const url = quizUrl(quiz.slug);
  const svg = await qrSvg(url);

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { width: 210mm; height: 297mm; }
          main { padding: 0 !important; }
          .poster { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
        }
      `}</style>
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <div className="poster mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-between overflow-hidden border border-slate-100 bg-white p-[12mm] text-center shadow-lg print:h-[297mm] print:w-[210mm]">
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <LogoMark className="size-14" />
            <span className="text-4xl font-extrabold tracking-tight text-navy-950">{kk.app.name}</span>
          </div>
          <div className="h-1 w-24 rounded-full bg-gold-500" />
        </div>
        <h1 className="px-4 text-[clamp(1.5rem,5vw,2.8rem)] font-extrabold leading-tight text-navy-950">{quiz.title}</h1>
        <div className="rounded-3xl border-4 border-gold-400 p-4">
          <div className="aspect-square w-[min(60vw,120mm)] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <div className="space-y-3">
          <p className="text-[clamp(1.2rem,3.6vw,2rem)] font-bold text-navy-900">{kk.share.posterText}</p>
          <p className="break-all font-mono text-sm text-slate-500">{url}</p>
        </div>
      </div>
    </>
  );
}
