import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

