import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="text-3xl font-semibold">We couldn&apos;t find that screen.</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            The route may be missing, or the record may not exist in the current dataset.
          </p>
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}>
            Back to app
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
