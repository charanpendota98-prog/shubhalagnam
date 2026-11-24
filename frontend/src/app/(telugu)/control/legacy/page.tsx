import { redirect } from "next/navigation";

/** Retire the former token-based console in favor of the session-authenticated control portal. */
export default function LegacyControlRedirect() {
  redirect("/control/login");
}
