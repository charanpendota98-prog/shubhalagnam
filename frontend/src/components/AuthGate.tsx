"use client";
/**
 * 🔒 AuthGate — friendly card shown when a private view has no session.
 * ===================================================================
 * Auth model in production: **phone number + password**. Phone OTP is disabled,
 * so this copy must never suggest that a login code will arrive by SMS or
 * WhatsApp. Password recovery runs through a previously verified email; an
 * account with no verified email has no automatic recovery, and we say so
 * instead of promising a reset link that will not come.
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
      <p className={`mt-1 text-sm text-amber-800 ${te ? "telugu" : ""}`}>
        {note || (admin
          ? (te ? "Admin console కి X-Admin-Key కావాలి — /admin లో key పెట్టండి (team నుంచి తీసుకోండి)." : "Admin console needs X-Admin-Key — put the key in /admin (get it from team).")
          : (te
            ? "మీ ఫోన్ నంబర్ మరియు పాస్‌వర్డ్‌తో login అవ్వండి. ఈ లాగిన్‌లో SMS/WhatsApp OTP ఉపయోగించబడదు. మీ data (inbox, credits, shortlist) మీరు మాత్రమే చూడగలరు."
            : "Sign in with your phone number and password — no SMS/WhatsApp OTP is used for this login. Only you can see your data (inbox, credits, shortlist)."))}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c0821]">
          {te ? "🔑 ఫోన్ + పాస్‌వర్డ్ లాగిన్" : "🔑 Phone + password login"}
        </Link>
        <Link href="/register" className="inline-flex min-h-11 items-center rounded-xl border border-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#7A0C2E] hover:bg-rose-50">
          {te ? "🆓 కొత్త registration (FREE 3 profiles)" : "🆓 New registration (FREE 3 profiles)"}
        </Link>
      </div>
      <p className={`mt-2 text-xs text-amber-700 ${te ? "telugu" : ""}`}>
        {te
          ? "🔒 Public profile/search లో phone numbers కనిపించవు. Owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; notification delivery హామీ లేదు."
          : "🔒 Phone numbers are not shown in public profile/search. Owner acceptance grants contact access in accepted-request account views; notification delivery is not guaranteed."}
      </p>
      <p className={`mt-1.5 text-xs leading-relaxed text-amber-700 ${te ? "telugu" : ""}`}>
        {te
          ? "పాస్‌వర్డ్ మర్చిపోయారా? ముందే ధృవీకరించిన ఈమెయిల్ ఉంటే /login లో రికవరీ చేసుకోవచ్చు. ఈమెయిల్ లేని ఖాతాకు ఆటోమేటిక్ రికవరీ లేదు."
          : "Forgot your password? If you verified an email earlier, recover it from /login. Accounts without a verified email have no automatic recovery."}
      </p>
    </div>
  );
}
