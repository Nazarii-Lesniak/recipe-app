import { Skeleton } from "@/shared/ui";

export default function RecipeDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-3/4 rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="flex gap-2.5">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <Skeleton className="h-80 rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
