import Link from "next/link";
import { Droplets } from "lucide-react";

import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.14),transparent_35%),linear-gradient(180deg,#f8fafc,#eef6ff)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-primary px-6 py-8 text-primary-foreground shadow-[0_30px_80px_-40px_rgba(13,148,136,0.8)] sm:px-8 sm:py-10">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm">
            <Droplets className="size-4" />
            Internal operations product
          </div>
          <div className="mt-8 max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Water supply made simple for the owner and the rider.
            </h1>
            <p className="text-sm leading-7 text-primary-foreground/80 sm:text-base">
              {APP_NAME} keeps daily deliveries, collections, dues, and rider
              accountability in one mobile-friendly workspace.
            </p>
          </div>
        </section>

        <Card className="border-white/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use email or phone. Admin goes to owner tools and riders go to
              today&apos;s delivery view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginForm />
            <div className="rounded-3xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Forgot password is ready as a placeholder flow for now.{" "}
              <Link className="font-medium text-primary" href="/forgot-password">
                Open reset help
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
