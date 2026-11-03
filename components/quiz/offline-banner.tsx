"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { kk } from "@/lib/i18n/kk";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white">
      <WifiOff className="size-4" /> {kk.participant.offline}
    </div>
  );
}
