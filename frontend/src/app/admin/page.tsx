"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy admin route: operations are authenticated through the private /control portal.
 * Admin payouts queue: /api/admin/payouts with utr, reject, phonepe://pay & upi_id support.
 */
export default function LegacyAdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/control"); }, [router]);
  return <main className="p-8 text-center">Redirecting to the secure operations portal…</main>;
}
