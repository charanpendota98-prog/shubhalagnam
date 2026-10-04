/**
 * MANA VIVAHA — SITE CONFIG (single place to customize everything)
 * ================================================================
 * Brand name, taglines, bot link, support numbers, prices, toggles —
 * anni ikkade marchandi. Header/Footer/CTA/Home anni ikkada nunchi chaduvutayi.
 *
 * Colors marchali ante: tailwind.config.ts (brand tokens) + src/app/globals.css (gradients).
 */

/**
 * R14 FIX: Support email ippudu ONE place nunchi (env var) fully configurable.
 * NEXT_PUBLIC_SUPPORT_EMAIL set చేస్తే — supportEmail + legal.grievanceOfficer +
 * legal.email అన్నీ ఒకేసారి update అవుతాయి (business domain mail వచ్చాక ఒక్క
 * env var మార్చితే సరిపోతుంది, code లో వెతికి మార్చాల్సిన అవసరం లేదు).
 * ఇప్పటికి (business mailbox set అయ్యేవరకు) fallback గా personal Gmail ఉంచాం.
 */
const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "charan.pendota98@gmail.com").trim();
function normalizeWhatsAppNumber(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : "";
}

const SUPPORT_WHATSAPP = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "");
const SUPPORT_PHONE = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").trim();
const SUPPORT_CONTACT_NUMBER = SUPPORT_PHONE || (SUPPORT_WHATSAPP ? `+${SUPPORT_WHATSAPP}` : "");

export const SITE_CONFIG = {
  // ---------- Brand ----------
  brandName: "మన వివాహ",
  brandNameTe: "మన వివాహ",           // 💍 R13: brand peru neat ga Telugu lo
  legalName: "Manavivaha",
  logoText: "MV",
  logoImage: "/logo.png",             // 💍 R13: kotha marriage logo (rings + lotus) — MV text kaadu
  tagline: "Telugu Matrimony",
  taglineTelugu: "₹99 ke Sambandham • Modati 3 FREE • Chatting ledu",
  domain: "manavivaha.in",
  siteUrl: process.env.SITE_URL || "https://manavivaha.in",
  established: 2025,

  // ---------- Contact / channels ----------
  botUsername: "@telugumatrimony1_bot",
  botUrl: "https://t.me/telugumatrimony1_bot",
  unlockBot: (tsapId: string) => `https://t.me/telugumatrimony1_bot?start=unlock_${encodeURIComponent(tsapId)}`,
  officialChannel: "@TSAP_MATRIMONY",
  officialChannelUrl: "https://t.me/TSAP_MATRIMONY",
  supportWhatsapp: SUPPORT_WHATSAPP,
  supportPhone: SUPPORT_PHONE,
  supportEmail: SUPPORT_EMAIL,
  supportConfigured: Boolean(SUPPORT_WHATSAPP || SUPPORT_PHONE || SUPPORT_EMAIL),
  get supportPhoneDisplay() { return this.supportPhone; },
  get supportLink() { return this.supportWhatsapp ? `https://wa.me/${this.supportWhatsapp}` : ""; },

  // ---------- Owner & Acceptance Details ----------
  owner: {
    id: "TeNDDG5ywwZIg3",
    name: "PENDOTA CHARAN",
    signatoryName: "PENDOTA CHARAN",
    ipAddress: "10.26.123.93",
    dateOfAcceptance: "2026-09-20 23:08:03 IST",
    contactNumber: SUPPORT_CONTACT_NUMBER,
    email: "charan.pendota98@gmail.com",
    status: "Verified & Digitally Accepted",
  },

  // ---------- Social (optional, empty = hide) ----------
  social: {
    telegramChannel: "https://t.me/TSBRIDE",
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

  // ---------- Legal / compliance & Acceptance ----------
  legal: {
    refundPolicy: "Unused-plan cash refund requests: within 7 days under the refund policy; declined/expired interests return one request credit, not cash.",
    privacyNote: "Mee number evariki share cheyyamu. Data India lo store avutundi.",
    grievanceOfficer: `PENDOTA CHARAN, ${SUPPORT_EMAIL}`,
    ownerId: "TeNDDG5ywwZIg3",
    ownerName: "PENDOTA CHARAN",
    signatoryName: "PENDOTA CHARAN",
    ipAddress: "10.26.123.93",
    dateOfAcceptance: "2026-09-20 23:08:03 IST",
    contactNumber: SUPPORT_CONTACT_NUMBER,
    email: SUPPORT_EMAIL,
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;
