import { redirect } from "next/navigation";

/** Legacy apply URL — console access is now email/password registration. */
export default function ApplyRedirectPage() {
  redirect("/register");
}
