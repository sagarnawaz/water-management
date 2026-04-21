import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(roleHome[user.role]);
}
