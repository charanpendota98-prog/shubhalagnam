/**
 * MANA VIVAHA — SITE CONFIG (single place to customize everything)
 * ================================================================
 * Brand name, taglines, bot link, support numbers, prices, toggles —
 * anni ikkade marchandi. Header/Footer/CTA/Home anni ikkada nunchi chaduvutayi.
 *
 * Colors marchali ante: tailwind.config.ts (brand tokens) + src/app/globals.css (gradients).
 */

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
  // 🐞 FIX (F08): ikkada **fake** number ("+91 98480 12345") undedi — legal/refund pages lo kooda ade
  // kanipinchi, customers tappu number ki message chesevaru. Ippudu env nunchi:
  //   NEXT_PUBLIC_SUPPORT_WHATSAPP=9190XXXXXXXX  NEXT_PUBLIC_SUPPORT_PHONE=+91 90XX XXX XXX
  // Set cheyyakapote Telegram bot link chupistundi (fake number eppudu chupinchamu).
  botUsername: "@telugumatrimony1_bot",
  botUrl: "https://t.me/telugumatrimony1_bot",
  unlockBot: (tsapId: string) => `https://t.me/telugumatrimony1_bot?start=unlock_${encodeURIComponent(tsapId)}`,
  // public-facing "Telegram" link — official CHANNEL (bot wording eppudu chupinchamu)
  officialChannel: "@TSAP_MATRIMONY",
  officialChannelUrl: "https://t.me/TSAP_MATRIMONY",
  supportWhatsapp: (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").trim(),
  supportPhone: (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").trim(),
  supportEmail: (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "care@manavivaha.in").trim(),
  supportConfigured: Boolean((process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").trim()),
  get supportPhoneDisplay() { return this.supportPhone || "Telegram bot (@" + this.botUsername.replace("@", "") + ")"; },
  get supportLink() { return this.supportWhatsapp ? `https://wa.me/${this.supportWhatsapp}` : this.botUrl; },

  // ---------- Social (optional, empty = hide) ----------
  social: {
    telegramChannel: "https://t.me/TSBRIDE",
    youtube: "",
    instagram: "",
    facebook: "",
  },

  // ---------- Pricing (home page lo chupisthundi) ----------
  pricing: {                       // 1 credit = 1 profile (interest request)
    currency: "₹",
    single: 29,                    // ₹29 → 1 profile (oke request — impulse)
    trial: 99,                     // ₹99 → 5 profiles
    family: 199,                   // ₹199 → 12 profiles
    premium: 299,                  // ₹299 → 25 profiles
    vip: 499,                      // ₹499 → 50 profiles
    bureauMonthly: 999,
    freeCredits: 3,                // modati 3 interest requests FREE
    referralPerPay: 50,            // referrer ki ₹50
    bundles: [
      { price: 29, profiles: 1, label: "Okka Request" },
      { price: 99, profiles: 5, label: "Sambandham" },
      { price: 199, profiles: 12, label: "Family" },
      { price: 299, profiles: 25, label: "Premium" },
      { price: 499, profiles: 50, label: "VIP" },
    ],
    addons: [
      { price: 49, label: "Profile Boost (7 days)" },
      { price: 49, label: "Who viewed me (30 days)" },
      { price: 99, label: "వేద గుణమేళనం రిపోర్ట్" },
      { price: 199, label: "Photo verification badge" },
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
    showTestimonials: true,     // real reviews vachaka demo tag teesesi ON unchu
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
    "OTP + DOB verified",
    "Photo-private mode",
    "Number pay tarvata matrame",
    "Watermark + fraud alerts",
  ],

  // ---------- Legal / compliance ----------
  legal: {
    refundPolicy: "7 days — pay ayyaka profile work avvakapoyina full refund",
    privacyNote: "Mee number evariki share cheyyamu. Data India lo store avutundi.",
    grievanceOfficer: "Charana Pendota, care@manavivaha.in",
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;
