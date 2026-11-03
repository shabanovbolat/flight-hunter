import type { Metadata, Viewport } from "next";
import { Amiri, Inter } from "next/font/google";
import "./globals.css";
import { kk } from "@/lib/i18n/kk";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: kk.app.name, template: `%s · ${kk.app.name}` },
  description: kk.app.description,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="kk" className={`${inter.variable} ${amiri.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
