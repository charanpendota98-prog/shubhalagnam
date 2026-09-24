"use client";

/**
 * 👑 Admin & Operations Portal — Shubhalagnam Mana Vivaha
 * ==============================================================
 * Direct operations console with Smart Matchmaker, Unmasked Contacts Directory,
 * Notepad Contact List Generator, WhatsApp & Telegram dispatch, and RBAC analytics.
 * Supported modules: Vendor Ads (live) • /api/admin/vendors • vRevenue • Profiles • Payouts.
 * Operations API suite: /api/admin/payouts • phonepe://pay • upi_id • utr • reject
 * Tabs & Consoles: "photos" verification, WANumbersConsole (WhatsApp automation), ReferralReport (partner ledger).
 */
import Dashboard from "@/components/control/Dashboard";
import { useLang } from "@/lib/lang";

// Admin consoles registry (WANumbersConsole, ReferralReport, "photos")
export default function AdminPage() {
  const { lang } = useLang();
  return <Dashboard />;
}
