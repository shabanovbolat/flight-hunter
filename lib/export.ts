import "server-only";
import * as XLSX from "xlsx";
import type { ResultRow } from "@/lib/results";
import { kk } from "@/lib/i18n/kk";
import { formatDate } from "@/lib/utils";

const c = kk.export.columns;

function table(rows: ResultRow[]) {
  const header = [c.rank, c.name, c.correct, c.total, c.score, c.accuracy, c.time, c.status, c.startedAt, c.finishedAt];
  const body = rows.map((r) => [
    r.rank ?? "",
    r.display_name,
    r.correct_count,
    r.total_questions,
    r.score,
    r.accuracy,
    Math.round(r.total_time_ms / 100) / 10,
    kk.results.statusLabels[r.status],
    formatDate(r.started_at),
    formatDate(r.finished_at),
  ]);
  return [header, ...body];
}

function csvCell(v: unknown): string {
  let s = String(v ?? "");
  // neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 with BOM so Excel shows Kazakh letters correctly. */
export function toCsv(rows: ResultRow[]): string {
  return "﻿" + table(rows).map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export interface QuestionStat {
  position: number;
  text: string;
  answers: number;
  correct: number;
  correct_rate: number | null;
}

export function toXlsx(rows: ResultRow[], questions: QuestionStat[]): Buffer {
  const wb = XLSX.utils.book_new();
  const sanitize = (t: unknown[][]) => t.map((r) => r.map((v) => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v)));
  const ws = XLSX.utils.aoa_to_sheet(sanitize(table(rows)));
  ws["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, kk.export.sheetResults);
  const qc = kk.export.questionColumns;
  const qs = XLSX.utils.aoa_to_sheet(
    sanitize([
      [qc.position, qc.question, qc.answers, qc.correct, qc.correctRate],
      ...questions.map((q, i) => [i + 1, q.text, q.answers, q.correct, q.correct_rate ?? ""]),
    ]),
  );
  qs["!cols"] = [{ wch: 5 }, { wch: 60 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, qs, kk.export.sheetQuestions);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
