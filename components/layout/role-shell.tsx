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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_28%),linear-gradient(180deg,rgba(240,249,255,0.92),rgba(248,250,252,1)_24%,rgba(248,250,252,1))]">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[19rem] shrink-0 rounded-[2rem] border border-white/75 bg-white/92 p-5 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur lg:flex lg:flex-col">
          <div className="rounded-[1.75rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(8,145,178,0.08),rgba(15,118,110,0.03))] p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-sm">
                <Droplets className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">AquaRoute Ops</p>
                <p className="text-sm text-muted-foreground">
                  {role === "admin" ? "Owner Console" : "Rider Console"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-2xl bg-white/80 px-3 py-2">
                <p className="font-medium text-foreground">{role === "admin" ? "Admin" : "Rider"}</p>
                <p>Workspace</p>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-2">
                <p className="font-medium text-foreground">Live</p>
                <p>Operations</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
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
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-22px_rgba(15,23,42,0.8)]"
                      : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-colors",
                      active ? "bg-white/12 text-primary-foreground" : "bg-slate-100 text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 rounded-[1.75rem] border border-border/70 bg-slate-50/90 p-4">
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
              <Button type="submit" variant="outline" className="h-11 w-full justify-start rounded-2xl">
                <LogOut className="size-4" />
                Logout
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="rounded-[2rem] border border-white/75 bg-white/92 px-5 py-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
                  <Droplets className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AquaRoute Ops</p>
                  <p className="text-xs text-muted-foreground">
                    {role === "admin" ? "Admin" : "Rider"} workspace
                  </p>
                </div>
              </div>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="icon-sm" className="rounded-2xl">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </header>

          <main className="flex-1 pb-28 pt-5 lg:pb-8">{children}</main>

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
                      "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-center text-xs font-medium transition-colors",
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
