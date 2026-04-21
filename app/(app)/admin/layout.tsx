import { RoleShell } from "@/components/layout/role-shell";
import { requireUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("admin");

  return (
    <RoleShell role="admin" user={user}>
      {children}
    </RoleShell>
  );
}
