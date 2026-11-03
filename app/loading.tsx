import { Spinner } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}
