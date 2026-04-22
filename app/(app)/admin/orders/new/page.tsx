import { redirect } from "next/navigation";

export default function NewOrderRedirectPage() {
  redirect("/admin/subscriptions/new");
}
