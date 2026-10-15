"use client";
/**
 * 🔒 AuthGate — private data 401/403 aithe friendly card (login ki pampistundi).
 * IDOR fix tarvata pages lo ide use chestam (inbox/credits/views/saved).
 */
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function AuthGate({ title = "", note = "", admin = false }: { title?: string; note?: string; admin?: boolean }) {
  const { lang } = useLang();
  const te = lang === "te";
  const titleText = title || (te ? "🔒 మీ account కి login చెయ్యండి" : "🔒 Login to your account");
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
      <p className="text-lg font-bold text-amber-900">{titleText}</p>
      <p className="mt-1 text-sm text-amber-800">
        {note || (admin
          ? (te ? "Admin console కి X-Admin-Key కావాలి — /admin లో key పెట్టండి (team నుంచి తీసుకోండి)." : "Admin console needs X-Admin-Key — put the key in /admin (get it from team).")
          : (te ? "మీ phone number తో OTP login చెయ్యండి — మీ data (inbox, credits, shortlist) మాత్రమే మీరు చూడగలరు. ఈ security, మీ privacy కోసం." : "OTP-login with your phone number — only you can see your data (inbox, credits, shortlist). This security is for your privacy."))}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Link href="/login" className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c0821]">
          {te ? "📱 OTP తో login" : "📱 Login with OTP"}
        </Link>
        <Link href="/register" className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#7A0C2E] hover:bg-rose-50">
          {te ? "🆓 కొత్త registration (FREE 3 profiles)" : "🆓 New registration (FREE 3 profiles)"}
        </Link>
      </div>
      <p className="mt-2 text-xs text-amber-700">
        {te ? "🔒 Public profile/search లో phone numbers కనిపించవు. Owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; notification delivery హామీ లేదు." : "🔒 Phone numbers are not shown in public profile/search. Owner acceptance grants contact access in accepted-request account views; notification delivery is not guaranteed."}
      </p>
    </div>
  );
}
