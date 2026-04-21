import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc,#eef6ff)] px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Password reset</CardTitle>
          <CardDescription>
            Supabase reset email can be connected here. For now, ask the owner
            to create or reset the user in the admin process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
            Recommended production flow:
            <br />
            1. Trigger Supabase password reset email.
            <br />
            2. Confirm redirect URL to the auth callback page.
            <br />
            3. Force riders to use secure device-based passwords.
          </div>
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-2xl")}>
            Back to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
