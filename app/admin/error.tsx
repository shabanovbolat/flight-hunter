"use client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { kk } from "@/lib/i18n/kk";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16">
      <Alert>
        <p className="font-medium">{kk.common.errorTitle}</p>
        <p>{kk.common.unknownError}</p>
      </Alert>
      <Button onClick={reset} variant="outline">
        {kk.common.retry}
      </Button>
    </div>
  );
}
