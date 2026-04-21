import { RoleShell } from "@/components/layout/role-shell";
import { requireUser } from "@/lib/auth/session";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("rider");

  return (
    <RoleShell role="rider" user={user}>
      {children}
    </RoleShell>
  );
}
