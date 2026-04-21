"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, LogOut, ShieldCheck, Truck } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getNavigation } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser, UserRole } from "@/types/domain";

export function RoleShell({
  role,
  user,
  children,
}: {
  role: UserRole;
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navigation = getNavigation(role);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(248,250,252,1)_20%,rgba(248,250,252,1))]">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
              <Droplets className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">AquaRoute Ops</p>
              <p className="text-sm text-muted-foreground">
                {role === "admin" ? "Owner Console" : "Rider Console"}
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => {
              const active =
                item.href === `/${role}`
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={`${role}-${item.id}`}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 rounded-3xl bg-slate-50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {role === "admin" ? (
                  <ShieldCheck className="size-4 text-primary" />
                ) : (
                  <Truck className="size-4 text-primary" />
                )}
                {user.name}
              </div>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full justify-start rounded-2xl">
                <LogOut className="size-4" />
                Logout
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
                  <Droplets className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AquaRoute Ops</p>
                  <p className="text-xs text-muted-foreground">{user.name}</p>
                </div>
              </div>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="icon-sm" className="rounded-2xl">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </header>

          <main className="flex-1 pb-28 pt-5 lg:pb-6">{children}</main>

          <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[1.75rem] border border-white/70 bg-white/95 p-2 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur lg:hidden">
            <div className="grid grid-cols-3 gap-2">
              {navigation.slice(0, 3).map((item) => {
                const active =
                  item.href === `/${role}`
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={`${role}-mobile-${item.id}`}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
