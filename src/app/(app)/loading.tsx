import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}
