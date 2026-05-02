import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-stretch gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
