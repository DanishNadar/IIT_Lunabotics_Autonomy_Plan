import { redirect } from "next/navigation";

/** Kept so old links keep working; there are no accounts, only the hidden /admin page. */
export default function LoginPage() {
  redirect("/admin");
}
