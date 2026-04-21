import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-full max-w-2xl" />
    </div>
  );
}

function MetricGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <MetricGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <ListCardsSkeleton />
    </div>
  );
}

export function CollectionPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-24" />
          ))}
        </CardContent>
      </Card>
      <ListCardsSkeleton />
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <MetricGridSkeleton />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <Skeleton key={row} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RiderLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-[1.75rem]" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
