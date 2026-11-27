import { Skeleton } from "@/shared/ui";

export default function LocaleLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
        {["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"].map((id) => (
          <Skeleton key={id} className="h-12 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {["r1", "r2", "r3", "r4", "r5", "r6"].map((id) => (
          <Skeleton key={id} className="h-80 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
