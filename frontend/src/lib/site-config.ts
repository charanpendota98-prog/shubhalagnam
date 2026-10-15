/**
 * MANA VIVAHA — SITE CONFIG (single place to customize everything)
 * ================================================================
 * Brand name, taglines, bot link, support numbers, prices, toggles —
 * anni ikkade marchandi. Header/Footer/CTA/Home anni ikkada nunchi chaduvutayi.
 *
 * Colors marchali ante: tailwind.config.ts (brand tokens) + src/app/globals.css (gradients).
 */

// Public contact details are owner-supplied deployment configuration only.
// Empty defaults deliberately hide unverified or unavailable support channels.
function normalizePublicEmail(raw: string): string {
  const email = String(raw || "").trim();
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) ? email : "";
}
function normalizeContactPhone(raw: string): string {
  const phone = String(raw || "").trim();
  const digits = phone.replace(/\D/g, "");
  return /^[+]?[-().\s\d]+$/.test(phone) && digits.length >= 8 && digits.length <= 15 ? phone : "";
}

const SUPPORT_EMAIL = normalizePublicEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "");
const BUSINESS_CONTACT_NAME = (process.env.NEXT_PUBLIC_BUSINESS_CONTACT_NAME || "").trim();
const BUSINESS_LOCATION = (process.env.NEXT_PUBLIC_BUSINESS_LOCATION || "").trim();
const GRIEVANCE_OFFICER = (process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || "").trim();
const LEGAL_NAME = (process.env.NEXT_PUBLIC_LEGAL_NAME || "").trim();
function normalizeWhatsAppNumber(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : "";
}

const SUPPORT_WHATSAPP = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "");
const SUPPORT_PHONE = normalizeContactPhone(process.env.NEXT_PUBLIC_SUPPORT_PHONE || "");
const SUPPORT_CONTACT_NUMBER = SUPPORT_PHONE || (SUPPORT_WHATSAPP ? `+${SUPPORT_WHATSAPP}` : "");

export const SITE_CONFIG = {
  // ---------- Brand ----------
  brandName: "మన వివాహ",
  brandNameTe: "మన వివాహ",           // 💍 R13: brand peru neat ga Telugu lo
  legalName: LEGAL_NAME,
  logoText: "MV",
  logoImage: "/logo.png",             // 💍 R13: kotha marriage logo (rings + lotus) — MV text kaadu
  tagline: "Telugu Matrimony",
  taglineTelugu: "₹99 ke Sambandham • Modati 3 FREE • Chatting ledu",
  domain: "manavivaha.in",
  siteUrl: process.env.SITE_URL || "https://manavivaha.in",
  established: 2025,

  // ---------- Contact / channels ----------
  supportWhatsapp: SUPPORT_WHATSAPP,
  supportPhone: SUPPORT_PHONE,
  supportEmail: SUPPORT_EMAIL,
  supportConfigured: Boolean(SUPPORT_WHATSAPP || SUPPORT_PHONE || SUPPORT_EMAIL),
  get supportPhoneDisplay() { return this.supportPhone; },
  get supportLink() { return this.supportWhatsapp ? `https://wa.me/${this.supportWhatsapp}` : ""; },

  // ---------- Optional, owner-supplied public contact ----------
  owner: {
    name: BUSINESS_CONTACT_NAME,
    contactNumber: SUPPORT_CONTACT_NUMBER,
    email: SUPPORT_EMAIL,
    location: BUSINESS_LOCATION,
  },

  // ---------- Social (optional, empty = hide) ----------
  social: {
    youtube: "",
    instagram: "",
    facebook: "",
  },

  // ---------- Pricing (home page lo chupisthundi) ----------
  pricing: {                       // 1 credit = 1 interest request
    currency: "₹",
    trial: 99,                     // ₹99 → 5 interest requests
    family: 199,                   // ₹199 → 12 interest requests
    premium: 299,                  // ₹299 → 25 interest requests
    vip: 499,                      // ₹499 → 50 interest requests
    bureauMonthly: 999,
    freeCredits: 3,                // modati 3 interest requests FREE
    referralPerPay: 50,            // referrer ki ₹50
    bundles: [
      { price: 99, profiles: 5, label: "Sambandham" },
      { price: 199, profiles: 12, label: "Family" },
      { price: 299, profiles: 25, label: "Premium" },
      { price: 499, profiles: 50, label: "VIP" },
    ],
    addons: [
      { price: 49, label: "Profile Boost (1 day)" },
      { price: 49, label: "Who viewed me (30 days)" },
      { price: 199, label: "Manual photo review request" },
    ],
    renewal: { price: 99, profiles: 8, label: "Renewal bonus" },
  },
  model: {
    chatting: false,               // 🚫 chatting ledu — consent-based requests
    interestCreditCost: 1,
    refundOnDecline: true,
  },

  // ---------- Feature toggles ----------
  features: {
    showTestimonials: false,    // show only after real, consented member testimonials are available
    showFaq: true,
    showPricing: true,
    showReferral: true,
    showBureau: true,
    showTicker: true,
    showStickyCta: true,        // mobile bottom bar
    showIdSearch: true,         // hero lo ID search box
    photoPrivateDefault: false,
    autoPostOnRegister: true,
  },

  // ---------- Trust points (home hero lo) ----------
  trustPoints: [
    "Phone OTP status shown; DOB is member-provided",
    "Photo privacy controls",
    "Contact details only after profile-owner acceptance",
    "Watermark + report tools",
  ],

  // ---------- Legal / compliance copy ----------
  legal: {
    refundPolicy: "Unused-plan cash refunds follow the Refund & Cancellation policy. Declined/expired request-credit returns follow the policy shown in your account; credits are not cash refunds.",
    privacyNote: "Data location depends on the hosting deployment and configured service providers; see the Privacy Policy.",
    grievanceOfficer: GRIEVANCE_OFFICER,
    contactNumber: SUPPORT_CONTACT_NUMBER,
    email: SUPPORT_EMAIL,
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;
