import { Skeleton } from "@/shared/ui";

export default function MyRecipesLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <Skeleton className="h-10 w-72 rounded-md" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {["m1", "m2", "m3"].map((id) => (
          <Skeleton key={id} className="h-80 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
