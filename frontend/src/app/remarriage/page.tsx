"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SecondMarriagePage from "../second-marriage/page";

export default function RemarriagePage() {
  const router = useRouter();

  useEffect(() => {
    // Graceful URL rewrite or direct component render
    if (typeof window !== "undefined" && window.location.pathname === "/remarriage") {
      router.replace("/second-marriage");
    }
  }, [router]);

  return <SecondMarriagePage />;
}
