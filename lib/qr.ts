import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/env";

export function quizUrl(slug: string) {
  return `${siteUrl()}/q/${slug}`;
}

const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#0a1224", light: "#ffffff" } };

export function qrSvg(text: string) {
  return QRCode.toString(text, { ...opts, type: "svg" });
}

export function qrPng(text: string, width = 1024) {
  return QRCode.toBuffer(text, { ...opts, type: "png", width });
}
