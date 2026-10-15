"""
MANA VIVAHA — WEDDING VENDOR ADS + PROMOTIONS 🏪
================================================
"Pelli sambandham aithey vendor lu kooda vuntaru — catering, photography, decorations...
 vaallaki promotions kooda cheyyali bestga." — advanced vendor ad network.

Enti idi chestundi:
  * 18 vendor categories (Telugu names tho) — catering, photography, decorations, hall, pandit...
  * Vendor packages and add-ons with the prices below as the source of truth.
  * Vendor directory and paid placement rotation with site-side impression/click tracking.
  * Lead capture to the vendor dashboard; WhatsApp notification is conditional on explicit setup.
  * Share-ready Telugu promo copy and posters; no external channel distribution is implied.
  * Admin: queue → approve/activate after review → reject → expire, leads, revenue summary.

Ee module lo pricing SINGLE SOURCE — maarchi ante ikkade maarchandi (site + docs anni API nunchi).
"""
import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlencode, quote

VENDORS_VERSION = "1.0"

STATE_FILE = os.environ.get("MANA_VIVAHA_VENDOR_STATE_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor_state.json"))
INR = "₹"

# ---------------------------------------------------------------------------
# CATEGORIES — pelli sambandham related (Telugu + English)
# ---------------------------------------------------------------------------
CATEGORIES: List[Dict] = [
    {"key": "catering", "en": "Catering", "te": "విందు భోజనం (Catering)", "icon": "🍛", "kw": "catering, bojanam, vindu, cooks, tiffin"},
    {"key": "photography", "en": "Photography", "te": "ఫోటోగ్రఫీ", "icon": "📸", "kw": "photos, camera, album, candid, pre-wedding shoot"},
    {"key": "videography", "en": "Videography", "te": "వీడియోగ్రఫీ / Drone", "icon": "🎥", "kw": "video, drone, live streaming, cinematic"},
    {"key": "decorations", "en": "Decorations & Flowers", "te": "అలంకరణ (Decorations) & పూలు", "icon": "🌸", "kw": "mandap, flowers, stage, backdrop, lighting"},
    {"key": "banquet_hall", "en": "Function Hall / Banquet", "te": "ఫంక్షన్ హాల్ / కళ్యాణ మండపం", "icon": "🏛️", "kw": "hall, kalyana mandapam, convention, AC hall"},
    {"key": "tent_house", "en": "Tent House", "te": "టెంట్ హౌస్", "icon": "⛺", "kw": "tent, chairs, shamiana, sound, tables"},
    {"key": "pandit", "en": "Pandit / Priest", "te": "పండితులు (పురోహితులు)", "icon": "🕉️", "kw": "pandit, purohit, muhurtham, puja, homam"},
    {"key": "jewellery", "en": "Jewellery", "te": "బంగారు నగలు (Jewellery)", "icon": "💍", "kw": "gold, jewellery, rings, haram, vaddanam"},
    {"key": "bridal_wear", "en": "Bridal & Groom Wear", "te": "పెళ్లి దుస్తులు (Pattu cheera / Sherwani)", "icon": "👰", "kw": "saree, pattu, sherwani, lehenga, rentals"},
    {"key": "makeup", "en": "Makeup & Beautician", "te": "మేకప్ & బ్యూటీషియన్", "icon": "💄", "kw": "bridal makeup, hairstyle, saree draping"},
    {"key": "mehendi", "en": "Mehendi / Mehndi Artist", "te": "గోరింటాకు (Mehendi)", "icon": "🌿", "kw": "mehendi, henna, gorintaku, bridal mehendi"},
    {"key": "music_dj", "en": "DJ & Band (Melam / Band)", "te": "DJ, బ్యాండ్, మేళం", "icon": "🎶", "kw": "dj, band, melam, nadaswaram, sannai"},
    {"key": "invitations", "en": "Invitations & Printing", "te": "పిల్లి కార్డు / Printing", "icon": "✉️", "kw": "invitation, cards, printing, e-invite, video invite"},
    {"key": "cars_travel", "en": "Cars & Travel", "te": "కార్లు & ట్రావెల్స్", "icon": "🚗", "kw": "car, luxury car, travel, bus, airport pick"},
    {"key": "wedding_planner", "en": "Wedding Planner / Event", "te": "వెడ్డింగ్ ప్లానర్", "icon": "📋", "kw": "planner, event management, coordinator, complete package"},
    {"key": "bakery_cake", "en": "Bakery & Cake", "te": "కేక్ & బేకరీ", "icon": "🎂", "kw": "cake, bakery, sweets, laddu, ariselu"},
    {"key": "gifts_hampers", "en": "Gifts & Hampers", "te": "గిఫ్ట్‌లు & హ్యాంపర్స్", "icon": "🎁", "kw": "gifts, hampers, sai panam, dry fruits"},
    {"key": "honeymoon_travel", "en": "Honeymoon Packages", "te": "హనీమూన్ ప్యాకేజీలు", "icon": "✈️", "kw": "honeymoon, tour, package, resort, visa"},
]

CATEGORY_MAP = {c["key"]: c for c in CATEGORIES}


def category_label(key: str) -> Dict:
    return CATEGORY_MAP.get(key, {"key": key, "en": key.replace("_", " ").title(), "te": key, "icon": "🏪"})


# ---------------------------------------------------------------------------
# AD PACKAGES — SINGLE SOURCE (₹)
# ---------------------------------------------------------------------------
PACKAGES: List[Dict] = [
    {
        "code": "V_SINGLE_POST", "name": "One-day Promo Share Kit", "price": 149, "days": 1,
        "telugu": "ఒకరోజు private share-ready promo kit (approval తర్వాత; directory listing కాదు)",
        "description_en": "One-day private share-ready promotional kit after approval; not a directory listing.",
        "perks": ["Share-ready promotional copy", "Square/status poster generation", "Private kit access for one day after approval", "No external post or reach is guaranteed"],
        "best_for": "One-day share-ready promotion; not a directory listing", "best_for_en": "One-day share-ready promotion; not a directory listing",
    },
    {
        "code": "V_BASIC", "name": "Basic Listing", "price": 499, "days": 30,
        "telugu": "డైరెక్టరీ లిస్టింగ్ — 30 రోజులు",
        "description_en": "One-category directory listing for 30 days.",
        "perks": ["1 category directory listing (30 days)", "Paid listing placement", "Call link; WhatsApp link only when separately provided"],
        "best_for": "కొత్త business directory listing", "best_for_en": "A new business directory listing",
    },
    {
        "code": "V_STATUS_BLAST", "name": "Status Share Kit", "price": 499, "days": 0,
        "telugu": "WhatsApp status కోసం share-ready promo సామగ్రి (₹499)",
        "description_en": "Share-ready promotional material for your own WhatsApp status; distribution is not included.",
        "perks": ["Status-sized poster generation", "Share-ready promotional copy", "No group/status distribution is included or guaranteed"],
        "best_for": "స్వయంగా status లో share చేసుకోవడానికి", "best_for_en": "For sharing on your own status",
    },
    {
        "code": "V_SPOTLIGHT", "name": "Spotlight (7 days)", "price": 999, "days": 7,
        "telugu": "అందుబాటులో ఉన్న site ad slots లో 7 రోజుల spotlight rotation",
        "description_en": "Eligibility for configured website ad-slot rotation for 7 days; ranking and reach are not guaranteed.",
        "perks": ["Eligibility for configured website ad-slot rotation during the term", "Site impressions and clicks are counted when recorded", "No fixed ranking or impression total is promised"],
        "best_for": "Website listing visibility", "best_for_en": "Website listing visibility",
    },
    {
        "code": "V_STANDARD", "name": "Standard Listing", "price": 1499, "days": 90,
        "telugu": "90 రోజుల listing + enquiry dashboard",
        "description_en": "Directory listing and vendor enquiry dashboard for 90 days.",
        "perks": ["Directory listing for 90 days", "Enquiries stored in the vendor dashboard", "WhatsApp notification only if a valid vendor WhatsApp number and delivery are configured", "Site-side impressions/clicks/enquiries when recorded"],
        "best_for": "దీర్ఘకాలిక directory listing", "best_for_en": "A longer-term directory listing",
    },
    {
        "code": "V_PREMIUM", "name": "Premium Placement", "price": 3999, "days": 180,
        "telugu": "180 రోజుల listing + eligible website placement rotation",
        "description_en": "Directory listing and eligibility for configured website placement rotation for 180 days.",
        "perks": ["Directory listing for 180 days", "Eligibility for configured website placement rotation", "Share-ready promo content and poster tools", "No identity verification, external distribution, or reach is implied"],
        "best_for": "దీర్ఘకాలిక website placement", "best_for_en": "A longer-term website placement",
    },
]

PACKAGE_MAP = {p["code"]: p for p in PACKAGES}
# Share-kit purchases generate materials only; they are not public directory listings.
SHARE_KIT_CODES = frozenset({"V_SINGLE_POST", "V_STATUS_BLAST"})

ADDONS_VENDOR = [
    {"code": "V_ADD_PHOTO", "name": "Photo/Video gallery (10 items)", "price": 299,
     "available": False, "note": "Not currently available online; do not pay"},
    {"code": "V_ADD_REEL", "name": "Reel / short video", "price": 999,
     "available": False, "note": "Not currently available online; no channel distribution included"},
    {"code": "V_ADD_INTERVIEW", "name": "Vendor interview video", "price": 1499,
     "available": False, "note": "Not currently available online"},
    {"code": "V_ADD_BRIDE_MAIL", "name": "Monthly mail to new brides/grooms", "price": 799,
     "available": False, "note": "Not currently available online"},
]

SLOTS = ["home_top_banner", "home_mid_strip", "vendors_top", "matches_sidebar", "requests_sidebar"]

# ---------------------------------------------------------------------------
# IN-MEMORY STATE (+ file persistence: vendors, leads, impressions)
# ---------------------------------------------------------------------------
VENDORS: List[Dict] = []
LEADS: List[Dict] = []
STATS_LOG: List[Dict] = []

PHONE_RE = None


def _now() -> str:
    return datetime.now().isoformat()


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _digits(text) -> str:
    return "".join(ch for ch in str(text or "") if ch.isdigit())


def explicit_whatsapp_number(vendor: Dict) -> str:
    """Return an Indian WhatsApp recipient only when the vendor opted in and the number is valid."""
    if not isinstance(vendor, dict) or vendor.get("whatsapp_explicit") is not True:
        return ""
    digits = _digits(vendor.get("whatsapp"))
    if len(digits) == 10:
        return "91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return ""


def is_active_listing(vendor: Optional[Dict], now: Optional[datetime] = None) -> bool:
    """Fail closed unless a listing package is activated and its term is unexpired."""
    if not isinstance(vendor, dict) or vendor.get("status") != "active":
        return False
    if str(vendor.get("package", "")).upper() in SHARE_KIT_CODES:
        return False
    expires_at = vendor.get("expires_at")
    if not expires_at:
        return False
    try:
        expires = datetime.fromisoformat(str(expires_at))
    except (TypeError, ValueError):
        return False
    if now is not None:
        current = now
    elif expires.tzinfo is not None:
        current = datetime.now(expires.tzinfo)
    else:
        current = datetime.now()
    try:
        return expires > current
    except TypeError:
        return False


def is_ready_share_kit(vendor: Optional[Dict], now: Optional[datetime] = None) -> bool:
    """Return true only for approved private kit access that is still within its term."""
    if not isinstance(vendor, dict) or vendor.get("status") != "kit_ready":
        return False
    package_code = str(vendor.get("package", "")).upper()
    if package_code not in SHARE_KIT_CODES:
        return False
    if package_code != "V_SINGLE_POST":
        return True
    try:
        expires = datetime.fromisoformat(str(vendor.get("expires_at", "")))
    except (TypeError, ValueError):
        return False
    current = now or (datetime.now(expires.tzinfo) if expires.tzinfo else datetime.now())
    if expires.tzinfo and current.tzinfo is None:
        current = current.replace(tzinfo=expires.tzinfo)
    elif not expires.tzinfo and current.tzinfo:
        current = current.replace(tzinfo=None)
    try:
        return expires > current
    except TypeError:
        return False


def _next_vendor_id() -> str:
    n = len([v for v in VENDORS if str(v.get("id", "")).startswith("MVV")]) + 1
    while any(v.get("id") == "MVV-%04d" % n for v in VENDORS):
        n += 1
    return "MVV-%04d" % n


def save_state() -> Dict:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({"at": _now(), "vendors": VENDORS[-800:], "leads": LEADS[-3000:],
                       "stats": STATS_LOG[-5000:]}, f, ensure_ascii=False, indent=1)
        return {"ok": True, "path": STATE_FILE, "vendors": len(VENDORS), "leads": len(LEADS)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:140]}


def _one_day_kit_expiry(vendor: Dict) -> str:
    """Cap V_SINGLE_POST private-material access at one day after activation."""
    start_value = vendor.get("activated_at") or vendor.get("created_at")
    try:
        start = datetime.fromisoformat(str(start_value))
    except (TypeError, ValueError):
        return datetime.now().isoformat()
    cap = start + timedelta(days=1)
    recorded = vendor.get("expires_at")
    if recorded:
        try:
            recorded_expiry = datetime.fromisoformat(str(recorded))
            if recorded_expiry <= cap:
                return recorded_expiry.isoformat()
        except (TypeError, ValueError):
            pass
    return cap.isoformat()


def load_state() -> Dict:
    global VENDORS, LEADS, STATS_LOG
    try:
        if not os.path.exists(STATE_FILE):
            return {"ok": True, "loaded": False}
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        raw_vendors = list(data.get("vendors", []))
        removed_demo_ids = {
            str(v.get("id", "")) for v in raw_vendors
            if v.get("source") == "demo_seed" or v.get("demo") is True
        }
        VENDORS = [v for v in raw_vendors if v.get("source") != "demo_seed" and v.get("demo") is not True]
        normalized = len(VENDORS) != len(raw_vendors)
        # Legacy listing tiers used to imply vendor verification. Preserve only an
        # explicit staff-review flag, and discard unsupported rating/review scores.
        for vendor in VENDORS:
            # Do not preserve the old generic verification badge in admin/public payloads.
            if "verified" in vendor:
                vendor.pop("verified", None)
                normalized = True
            for score_key in ("rating", "reviews"):
                if score_key in vendor:
                    vendor.pop(score_key, None)
                    normalized = True
            # Older registrations copied the call number into a WhatsApp field.
            # Do not expose it as WhatsApp unless an explicit opt-in marker exists.
            if vendor.get("whatsapp_explicit") is not True and vendor.get("whatsapp"):
                vendor["whatsapp"] = ""
                normalized = True
            package_code = str(vendor.get("package", "")).upper()
            if vendor.get("status") == "active" and package_code in SHARE_KIT_CODES:
                # Share-kit payments create private materials, never public listings.
                vendor["status"] = "kit_ready"
                normalized = True
            if package_code == "V_SINGLE_POST":
                if vendor.get("package_days") != 1:
                    vendor["package_days"] = 1
                    normalized = True
                if vendor.get("status") == "kit_ready":
                    # Cap legacy access at one day after activation, preserving an
                    # earlier recorded expiry and failing closed if dates are absent.
                    expiry = _one_day_kit_expiry(vendor)
                    if vendor.get("expires_at") != expiry:
                        vendor["expires_at"] = expiry
                        normalized = True
            elif package_code == "V_STATUS_BLAST" and vendor.get("status") == "kit_ready" and vendor.get("expires_at"):
                vendor["expires_at"] = ""
                normalized = True
        raw_leads = list(data.get("leads", []))
        LEADS = [lead for lead in raw_leads
                 if lead.get("source") != "demo_seed" and str(lead.get("vendor_id", "")) not in removed_demo_ids]
        STATS_LOG = list(data.get("stats", []))
        if normalized or len(LEADS) != len(raw_leads):
            save_state()
        return {"ok": True, "loaded": True, "vendors": len(VENDORS), "leads": len(LEADS)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:140]}


# ---------------------------------------------------------------------------
# REGISTER / ACTIVATE
# ---------------------------------------------------------------------------
def validate_vendor_form(form: Dict) -> Dict:
    problems = []
    problems_en = []
    name = str(form.get("business_name", "")).strip()
    if len(name) < 3:
        problems.append("business_name: business పేరు 3 aksharalu kanna ఎక్కువ ఉండాలి")
        problems_en.append("Business name must be at least 3 characters long.")
    if str(form.get("category", "")).strip() not in CATEGORY_MAP:
        problems.append("category: list లో ఉన్న category select చెయ్యండి")
        problems_en.append("Select a category from the available list.")
    phone = _digits(form.get("phone"))
    if len(phone) != 10:
        problems.append("phone: 10 digit mobile number ఇవ్వండి")
        problems_en.append("Enter a 10-digit mobile number.")
    whatsapp = _digits(form.get("whatsapp"))
    if str(form.get("whatsapp", "")).strip() and len(whatsapp) != 10:
        problems.append("whatsapp: optional field must be a 10 digit number")
        problems_en.append("The optional WhatsApp number must contain 10 digits.")
    city = str(form.get("city", "")).strip()
    if len(city) < 2:
        problems.append("city: city/town పేరు ఇవ్వండి")
        problems_en.append("Enter a city or town.")
    pkg = str(form.get("package", "V_BASIC")).strip().upper()
    if pkg not in PACKAGE_MAP:
        problems.append("package: %s" % ", ".join(PACKAGE_MAP))
        problems_en.append("Select a valid package.")
    return {"ok": not problems, "problems": problems, "problems_en": problems_en}


def register_vendor(form: Dict, all_vendors: Optional[List[Dict]] = None) -> Dict:
    """Vendor signup → pending → reviewed listing or share-kit fulfillment."""
    all_vendors = all_vendors if all_vendors is not None else VENDORS
    v = validate_vendor_form(form)
    if not v["ok"]:
        return {"ok": False, "reason": "invalid", "problems": v["problems"], "problems_en": v["problems_en"],
                "message_telugu": "⚠️ ఈ details saricheyyali: " + " | ".join(v["problems"]),
                "message_en": "Please review the business details and correct the highlighted fields."}
    phone = _digits(form.get("phone"))
    cat = str(form.get("category")).strip()
    pkg = str(form.get("package", "V_BASIC")).strip().upper()
    dup = next((x for x in all_vendors if _digits(x.get("phone")) == phone
                and x.get("category") == cat and x.get("status") in ("pending", "active", "kit_ready")), None)
    if dup:
        return {"ok": False, "reason": "duplicate", "vendor_id": dup.get("id"),
                "message_telugu": "ℹ️ ఈ number తో ee category లో already listing ఉంది (%s) — update చెయ్యాలి అంటే support కి చెప్పండి"
                                  % dup.get("id"),
                "message_en": "A listing for this number and category already exists (%s). Contact configured vendor support if it needs an update." % dup.get("id")}
    vendor = {
        "id": _next_vendor_id(),
        "business_name": str(form.get("business_name")).strip()[:80],
        "owner_name": str(form.get("owner_name", "")).strip()[:60],
        "category": cat,
        "category_te": category_label(cat)["te"],
        "icon": category_label(cat)["icon"],
        "phone": phone,
        # A call number is not presumed to be a WhatsApp number. Keep this blank
        # until the vendor explicitly provides a WhatsApp destination.
        "whatsapp": _digits(form.get("whatsapp")),
        "whatsapp_explicit": bool(_digits(form.get("whatsapp"))),
        "city": str(form.get("city", "")).strip()[:40],
        "district": str(form.get("district", "")).strip()[:40],
        "state": str(form.get("state", "TS")).strip()[:4],
        "service_areas": str(form.get("service_areas", "")).strip()[:160],
        "price_range": str(form.get("price_range", "")).strip()[:60],
        "about": str(form.get("about", "")).strip()[:600],
        "experience_years": str(form.get("experience_years", "")).strip()[:10],
        "photo_url": str(form.get("photo_url", "")).strip()[:200],
        "package": pkg,
        "package_price": PACKAGE_MAP[pkg]["price"],
        "package_days": PACKAGE_MAP[pkg]["days"],
        "status": "pending",
        "impressions": 0,
        "clicks": 0,
        "leads": 0,
        "created_at": _now(),
        "activated_at": "",
        "expires_at": "",
        "payment_ref": "",
        "source": str(form.get("source", "website"))[:30],
    }
    all_vendors.append(vendor)
    save_state()
    merchant_upi = (os.getenv("VENDOR_UPI_ID", "").strip()
                    or os.getenv("PAYMENT_UPI_ID", "").strip()
                    or os.getenv("PAY_UPI_ID", "").strip())
    phonepe_link = ""
    is_share_kit = pkg in SHARE_KIT_CODES
    steps = ["1️⃣ మీ vendor request review కోసం నమోదు అయింది (ID: %s)" % vendor["id"]]
    steps_en = ["1. Your business request is recorded for review (ID: %s)." % vendor["id"]]
    if merchant_upi:
        phonepe_link = "upi://pay?" + urlencode({
            "pa": merchant_upi, "pn": "Mana Vivaha",
            "am": str(PACKAGE_MAP[pkg]["price"]), "cu": "INR",
            "tn": vendor["id"],
        })
        steps_en.extend([
            "2. Pay ₹%d to the official UPI ID %s and include %s in the payment note." %
            (PACKAGE_MAP[pkg]["price"], merchant_upi, vendor["id"]),
            "3. The payment reference is reviewed against the bank statement before a decision.",
            ("4. If approved, private share-ready kit access is available for one day. This is not a directory listing and includes no external posting or reach guarantee."
             if pkg == "V_SINGLE_POST" else
             "4. If approved, private share-ready kit access is provided. This is not a directory listing and includes no external posting or reach guarantee."
             if is_share_kit else
             "4. If payment-reference and business-details review is approved, the directory listing is published for the package term."),
        ])
        steps.extend([
            "2️⃣ అధికారిక UPI ID %s కి ₹%d చెల్లించి payment note లో %s ఇవ్వండి" %
            (merchant_upi, PACKAGE_MAP[pkg]["price"], vendor["id"]),
            "3️⃣ UTR ను బ్యాంక్ స్టేట్‌మెంట్‌తో సరిపోల్చిన తర్వాతే review జరుగుతుంది",
            ("4️⃣ Review ఆమోదమైతే ఒకరోజు private share-ready promo kit access లభిస్తుంది; ఇది directory listing కాదు, external post/reach హామీ లేదు."
             if pkg == "V_SINGLE_POST" else
             "4️⃣ Review ఆమోదమైతే private share-ready kit లభిస్తుంది; ఇది directory listing కాదు, external post/reach హామీ లేదు."
             if is_share_kit else
             "4️⃣ Payment reference, business details review ఆమోదమైతే package term ప్రకారం directory listing ప్రచురించబడుతుంది."),
        ])
    else:
        steps.append("2️⃣ Payment checkout ఇంకా configure కాలేదు. అధికారిక వివరాలు కనిపించే వరకు డబ్బు పంపవద్దు.")
        steps_en.append("2. Checkout is not configured. Do not send payment until official payment instructions are shown.")
    package_description = ("private share-ready promo materials; not a directory listing"
                           if is_share_kit else "listing/placement package")
    package_term = ("1-day private-kit access after approval" if pkg == "V_SINGLE_POST"
                    else "one-time private-kit access" if is_share_kit
                    else "%d days" % PACKAGE_MAP[pkg]["days"])
    return {"ok": True, "vendor_id": vendor["id"], "vendor": vendor,
            "package": PACKAGE_MAP[pkg], "amount": PACKAGE_MAP[pkg]["price"],
            "upi_id": merchant_upi, "checkout_available": bool(merchant_upi),
            "phonepe_link": phonepe_link, "steps_telugu": steps, "steps_en": steps_en,
            "message_telugu": "%s — మీ request వచ్చింది. Package: %s (₹%d; %s; %s). Payment reference review తర్వాతే package activation నిర్ణయిస్తారు."
                              % (vendor["business_name"], PACKAGE_MAP[pkg]["name"],
                                 PACKAGE_MAP[pkg]["price"], package_term, package_description),
            "message_en": "%s — your request was received. Package: %s (₹%d; %s; %s). Activation or listing publication is decided only after payment-reference and business-details review."
                         % (vendor["business_name"], PACKAGE_MAP[pkg]["name"],
                            PACKAGE_MAP[pkg]["price"], package_term, package_description)}


def activate_vendor(vendor_id: str, package: str = "", utr: str = "",
                    all_vendors: Optional[List[Dict]] = None) -> Dict:
    all_vendors = all_vendors if all_vendors is not None else VENDORS
    v = next((x for x in all_vendors if x.get("id") == vendor_id), None)
    if not v:
        return {"ok": False, "reason": "not_found"}
    pkg_code = (package or v.get("package") or "V_BASIC").upper()
    if pkg_code not in PACKAGE_MAP:
        return {"ok": False, "reason": "bad_package"}
    pkg = PACKAGE_MAP[pkg_code]
    days = pkg["days"]
    v["package"] = pkg_code
    v["package_price"] = pkg["price"]
    v["package_days"] = days
    is_share_kit = pkg_code in SHARE_KIT_CODES
    v["status"] = "kit_ready" if is_share_kit else "active"
    v.pop("verified", None)
    activated_at = datetime.now()
    v["activated_at"] = activated_at.isoformat()
    v["expires_at"] = ((activated_at + timedelta(days=days)).isoformat()
                        if (not is_share_kit or pkg_code == "V_SINGLE_POST") else "")
    v["payment_ref"] = utr
    save_state()
    if pkg_code == "V_SINGLE_POST":
        message = "✅ %s ఒకరోజు private share-ready promo kit review అయింది. Materials approval తర్వాత 1 రోజు అందుబాటులో ఉంటాయి; directory listing లేదా external post ఇందులో లేదు." % v["business_name"]
    elif is_share_kit:
        message = "✅ %s private share-ready promo kit review అయింది. Materials owner dashboard లో చూడండి; directory listing లేదా external post ఇందులో లేదు." % v["business_name"]
    else:
        message = "✅ %s ACTIVE (%s, %d days). Website listing placement eligibility package ప్రకారం ఉంటుంది; fixed rank/reach హామీ కాదు." % (v["business_name"], pkg["name"], days)
    return {"ok": True, "vendor": v, "package": pkg, "days": days,
            "expires_at": v["expires_at"], "kit_ready": is_share_kit,
            "listing_active": not is_share_kit,
            "message_telugu": message}


def reject_vendor(vendor_id: str, reason: str = "") -> Dict:
    v = next((x for x in VENDORS if x.get("id") == vendor_id), None)
    if not v:
        return {"ok": False, "reason": "not_found"}
    v["status"] = "rejected"
    v["reject_reason"] = reason[:160]
    save_state()
    return {"ok": True, "vendor": v, "message_telugu": "❌ %s reject అయ్యింది — %s" % (v["business_name"], reason or "details verify avvaledu")}


def expire_due_vendors() -> Dict:
    """Kalam అయిన vendors ని auto-expire (worker/startup లో call)."""
    now = datetime.now()
    n = 0
    for v in VENDORS:
        if v.get("status") != "active":
            continue
        try:
            exp = datetime.fromisoformat(v.get("expires_at", ""))
        except Exception:
            continue
        if exp < now:
            v["status"] = "expired"
            n += 1
    if n:
        save_state()
    return {"ok": True, "expired": n}


# ---------------------------------------------------------------------------
# DIRECTORY + SEARCH
# ---------------------------------------------------------------------------
def vendors_directory(category: str = "", district: str = "", city: str = "", q: str = "",
                      include_inactive: bool = False, limit: int = 60) -> Dict:
    items = [v for v in VENDORS if include_inactive or is_active_listing(v)]
    if category:
        cats = [c.strip() for c in category.split(",") if c.strip()]
        items = [v for v in items if v.get("category") in cats]
    if district:
        items = [v for v in items if district.lower() in str(v.get("district", "")).lower()
                 or district.lower() in str(v.get("city", "")).lower()
                 or district.lower() in str(v.get("service_areas", "")).lower()]
    if city:
        items = [v for v in items if city.lower() in str(v.get("city", "")).lower()
                 or city.lower() in str(v.get("service_areas", "")).lower()]
    if q:
        needle = q.lower()
        items = [v for v in items if needle in (str(v.get("business_name", "")) + " "
                                                + str(v.get("about", "")) + " "
                                                + str(v.get("city", "")) + " "
                                                + str(v.get("category", ""))).lower()]
    order = {"V_PREMIUM": 0, "V_SPOTLIGHT": 0, "V_STANDARD": 1, "V_BASIC": 2,
             "V_SINGLE_POST": 3, "V_STATUS_BLAST": 3}
    # Placement tier is a disclosed paid package, not a popularity/trust score.
    items.sort(key=lambda v: (order.get(v.get("package"), 4),
                              str(v.get("business_name", "")).casefold(), str(v.get("id", ""))))
    counts: Dict[str, int] = {}
    for v in [x for x in VENDORS if include_inactive or is_active_listing(x)]:
        counts[v["category"]] = counts.get(v["category"], 0) + 1
    return {"total": len(items), "counts": counts, "limit": limit,
            "vendors": [public_vendor(v) for v in items[:limit]],
            "categories": [{**c, "count": counts.get(c["key"], 0)} for c in CATEGORIES]}


def public_vendor(v: Dict, full_contact: bool = True) -> Dict:
    """Directory/listing కి vendor view (contact WhatsApp CTA తో)."""
    out = {
        "id": v.get("id"), "business_name": v.get("business_name"),
        "category": v.get("category"), "category_te": v.get("category_te"),
        "category_en": category_label(v.get("category", ""))["en"],
        "icon": v.get("icon") or category_label(v.get("category", ""))["icon"],
        "city": v.get("city"), "district": v.get("district"), "state": v.get("state"),
        "service_areas": v.get("service_areas"), "price_range": v.get("price_range"),
        "about": v.get("about"), "experience_years": v.get("experience_years"),
        "listing_details_reviewed": bool(v.get("manual_verified", False)), "package": v.get("package"),
        "photo_url": v.get("photo_url", ""), "status": v.get("status"),
    }
    phone = _digits(v.get("phone"))
    wa = explicit_whatsapp_number(v)
    if full_contact and wa:
        message_te = ("నమస్తే! మన వివాహ (manavivaha.in) లో మీ %s listing చూశాను — details చెప్పండి"
                      if is_active_listing(v) else
                      "నమస్తే! మన వివాహ promo materials లో మీ %s business చూశాను — details చెప్పండి") % v.get("business_name", "")
        message_en = ("Hello, I saw your listing on Mana Vivaha and would like more details about %s."
                      if is_active_listing(v) else
                      "Hello, I saw your promotional materials on Mana Vivaha and would like more details about %s.") % v.get("business_name", "")
        out["whatsapp_link"] = "https://wa.me/%s?text=%s" % (wa, quote(message_te))
        out["whatsapp_link_te"] = out["whatsapp_link"]
        out["whatsapp_link_en"] = "https://wa.me/%s?text=%s" % (wa, quote(message_en))
    if full_contact and phone:
        out["call_link"] = "tel:+91%s" % phone
    return out


# ---------------------------------------------------------------------------
# AD ROTATION (paid-first, weighted, daily budget-ish)
# ---------------------------------------------------------------------------
def ad_rotation(slot: str = "home_top_banner", limit: int = 2, track: bool = True) -> Dict:
    if slot not in SLOTS:
        slot = "home_top_banner"
    active = [v for v in VENDORS if is_active_listing(v)]
    weighted = []
    for v in active:
        pkg = v.get("package")
        w = {"V_PREMIUM": 5, "V_SPOTLIGHT": 6, "V_STANDARD": 3, "V_BASIC": 1}.get(pkg, 0)
        if w:
            weighted.extend([v] * w)
    random.shuffle(weighted)
    picked, seen = [], set()
    for v in weighted:
        if v["id"] in seen:
            continue
        seen.add(v["id"])
        picked.append(v)
        if len(picked) >= limit:
            break
    if track:
        for v in picked:
            v["impressions"] = int(v.get("impressions", 0)) + 1
            STATS_LOG.append({"at": _now(), "type": "impression", "slot": slot, "vendor_id": v["id"]})
        if picked:
            save_state()
    return {"slot": slot, "count": len(picked), "ads": [ad_card(v) for v in picked],
            "note_telugu": "Packages వేర్వేరు: ఒకరోజు share-ready promo kit ₹149 నుంచి; directory-listing packages ₹499 నుంచి. ఏ ad slot లోనైనా placement లేదా views హామీ కాదు."}


def ad_card(v: Dict) -> Dict:
    contact = public_vendor(v)
    return {"vendor_id": v.get("id"), "business_name": v.get("business_name"),
            "category": v.get("category"), "category_te": v.get("category_te"),
            "icon": v.get("icon"), "city": v.get("city"), "price_range": v.get("price_range"),
            "listing_details_reviewed": bool(v.get("manual_verified", False)),
            "cta_telugu": "వివరాలు చూడండి", "whatsapp_link": contact.get("whatsapp_link", ""),
            "call_link": contact.get("call_link", ""), "detail_url": "/vendors/%s" % v.get("id")}


def track_vendor_click(vendor_id: str, source: str = "") -> Dict:
    v = next((x for x in VENDORS if x.get("id") == vendor_id), None)
    if not v:
        return {"ok": False, "reason": "not_found"}
    if not is_active_listing(v):
        return {"ok": False, "reason": "not_active"}
    v["clicks"] = int(v.get("clicks", 0)) + 1
    STATS_LOG.append({"at": _now(), "type": "click", "vendor_id": vendor_id, "source": source[:40]})
    save_state()
    return {"ok": True, "vendor_id": vendor_id, "clicks": v["clicks"]}


# ---------------------------------------------------------------------------
# LEADS (site nunchi enquiry → vendor WhatsApp + admin alert)
# ---------------------------------------------------------------------------
def vendor_lead(vendor_id: str, form: Dict) -> Dict:
    v = next((x for x in VENDORS if x.get("id") == vendor_id), None)
    if not v:
        return {"ok": False, "reason": "not_found"}
    if not is_active_listing(v):
        return {"ok": False, "reason": "not_active"}
    name = str(form.get("name", "")).strip()
    phone = _digits(form.get("phone"))
    problems = []
    if form.get("consent") is not True:
        problems.append("consent to share enquiry details")
    if len(name) < 2:
        problems.append("name")
    if len(phone) != 10:
        problems.append("phone (10 digits)")
    if problems:
        return {"ok": False, "reason": "invalid", "problems": problems,
                "message_telugu": "⚠️ ఈ details saricheyyali: " + ", ".join(problems)}
    lead = {
        "id": "VL-%s-%04d" % (datetime.now().strftime("%y%m%d"), len(LEADS) + 1),
        "vendor_id": vendor_id, "vendor_name": v.get("business_name"),
        "name": name[:60], "phone": phone, "event_date": str(form.get("event_date", ""))[:20],
        "district": str(form.get("district", ""))[:40], "budget": str(form.get("budget", ""))[:30],
        "message": str(form.get("message", ""))[:400], "at": _now(), "status": "new",
        "source": str(form.get("source", "website"))[:30],
    }
    LEADS.append(lead)
    v["leads"] = int(v.get("leads", 0)) + 1
    save_state()
    return {"ok": True, "lead": lead, "vendor": public_vendor(v),
            "vendor_whatsapp_text": lead_to_vendor_text(v, lead),
            "customer_text_telugu": (
                "🙏 %s గారు, మీ enquiry %s listing కి submit అయింది. Vendor మీ వివరాలు చూసి సంప్రదించవచ్చు; స్పందించే సమయం మారవచ్చు. "
                "ఇతర ఎంపికలు ఉంటే కింద చూడండి."
                % (lead["name"], v.get("business_name"))),
            "message_telugu": "✅ Enquiry submit అయింది — vendor స్పందన సమయం మారవచ్చు."}


def lead_to_vendor_text(vendor: Dict, lead: Dict) -> str:
    return ("🔔 *NEW ENQUIRY* — మన వివాహ\n"
            "Business: %s (%s)\n"
            "Customer: %s\n📞 %s\n"
            "📍 %s | 📅 Event: %s | 💰 Budget: %s\n"
            "📝 %s\n\n"
            "Customer ని మీరు ఇచ్చిన contact వివరాల ద్వారా సంప్రదించండి.\n"
            "— మన వివాహ (manavivaha.in)"
            % (vendor.get("business_name"), vendor.get("category_te") or vendor.get("category"),
               lead.get("name"), lead.get("phone"), lead.get("district") or "-",
               lead.get("event_date") or "-", lead.get("budget") or "-", lead.get("message") or "-"))


def leads_for(vendor_id: str, limit: int = 50) -> List[Dict]:
    return list(reversed([l for l in LEADS if l.get("vendor_id") == vendor_id]))[:limit]


# ---------------------------------------------------------------------------
# PROMO CONTENT (Telugu posts + poster text) — channels ki ready
# ---------------------------------------------------------------------------
def promo_post(vendor: Dict, variant: int = 0, channel: str = "") -> Dict:
    """Build language-specific share-ready copy; never publish to an external channel."""
    name = str(vendor.get("business_name", "")).strip()
    category = category_label(vendor.get("category", ""))
    cat_en = category.get("en") or str(vendor.get("category", "Vendor service")).replace("_", " ").title()
    cat_te = category.get("te") or cat_en
    icon = vendor.get("icon") or "🏪"
    city = str(vendor.get("city", "")).strip()
    areas = str(vendor.get("service_areas") or city).strip()
    price = str(vendor.get("price_range") or "").strip()
    phone = _digits(vendor.get("phone"))
    wa_phone = explicit_whatsapp_number(vendor)
    # Business names, descriptions, and location strings are owner-supplied and are not translated.
    about = str(vendor.get("about") or "").strip()
    exp = str(vendor.get("experience_years", "")).strip()
    details = about[:220] if about else "Business details as provided by the vendor."
    details_te = about[:220] if about else "వ్యాపారం గురించి వివరాలను వ్యాపార యజమాని అందించారు."
    location_en = "📍 %s%s" % (city or "", (" | " + areas) if areas and areas != city else "")
    location_te = "📍 %s%s" % (city or "", (" | " + areas) if areas and areas != city else "")
    price_line_en = ("💰 Price range: %s\n" % price) if price else ""
    price_line_te = ("💰 ధర పరిధి: %s\n" % price) if price else ""
    exp_line_en = ("Experience stated by the vendor: %s years\n" % exp) if exp else ""
    exp_line_te = ("యజమాని తెలిపిన అనుభవం: %s సంవత్సరాలు\n" % exp) if exp else ""
    contact_lines_en = ("📞 Call: +91%s\n" % phone) if phone else ""
    contact_lines_te = ("📞 కాల్: +91%s\n" % phone) if phone else ""
    if wa_phone:
        contact_lines_en += "💬 WhatsApp: https://wa.me/%s\n" % wa_phone
        contact_lines_te += "💬 WhatsApp: https://wa.me/%s\n" % wa_phone
    if not contact_lines_en:
        contact_lines_en = "Contact options have not been supplied for this business.\n"
        contact_lines_te = "ఈ వ్యాపారానికి సంప్రదింపు వివరాలు అందుబాటులో లేవు.\n"
    listing_url = ("https://manavivaha.in/vendors/%s" % str(vendor.get("id", ""))
                   if is_active_listing(vendor) else "")
    footer_en = (("Details: %s\n" % listing_url) if listing_url else
                 "No public directory listing is included in this package.\n")
    footer_en += "Promotional copy for the vendor to review and share; no external post is performed."
    footer_te = (("వివరాలు: %s\n" % listing_url) if listing_url else
                 "ఈ package లో public directory listing లేదు.\n")
    footer_te += "ప్రచార సందేశాన్ని యజమాని పరిశీలించి స్వయంగా పంచుకోవచ్చు; ఈ tool బయట ఎక్కడా పోస్ట్ చేయదు."

    telegram_variants_en = [
        ("%s *%s* — %s\n\n%s\n%s\n%s%s%s\n%s" %
         (icon, name, cat_en, details, location_en, price_line_en, exp_line_en, contact_lines_en, footer_en)),
        ("Wedding service: %s — %s\n\n%s\n%s\n%s%s%s\n%s" %
         (name, cat_en, details, location_en, price_line_en, exp_line_en, contact_lines_en, footer_en)),
        ("%s %s | %s\n\n%s\n%s\n%s%s%s\n%s" %
         (icon, name, cat_en, details, location_en, price_line_en, exp_line_en, contact_lines_en, footer_en)),
    ]
    telegram_variants_te = [
        ("%s *%s* — %s\n\n%s\n%s\n%s%s%s\n%s" %
         (icon, name, cat_te, details_te, location_te, price_line_te, exp_line_te, contact_lines_te, footer_te)),
        ("వివాహ సేవ: %s — %s\n\n%s\n%s\n%s%s%s\n%s" %
         (name, cat_te, details_te, location_te, price_line_te, exp_line_te, contact_lines_te, footer_te)),
        ("%s %s | %s\n\n%s\n%s\n%s%s%s\n%s" %
         (icon, name, cat_te, details_te, location_te, price_line_te, exp_line_te, contact_lines_te, footer_te)),
    ]
    status_copy_en = ("%s %s — %s\n%s\n%s\n%s%s%s" %
                      (icon, name, cat_en, details[:160], location_en, price_line_en, contact_lines_en, listing_url))
    status_copy_te = ("%s %s — %s\n%s\n%s\n%s%s%s" %
                      (icon, name, cat_te, details_te[:160], location_te, price_line_te, contact_lines_te, listing_url))
    whatsapp_en = [status_copy_en, telegram_variants_en[(variant + 1) % len(telegram_variants_en)]]
    whatsapp_te = [status_copy_te, telegram_variants_te[(variant + 1) % len(telegram_variants_te)]]
    poster_text_en = "%s %s\n%s | %s\n%s%s%s" % (icon, name, cat_en, city, contact_lines_en, "\n" if listing_url else "", listing_url)
    poster_text_te = "%s %s\n%s | %s\n%s%s%s" % (icon, name, cat_te, city, contact_lines_te, "\n" if listing_url else "", listing_url)
    share_text_en = (("Hello, I saw your listing on Mana Vivaha — " if listing_url else
                      "Hello, I saw your promotional details on Mana Vivaha — ") + name)
    share_text_te = (("నమస్కారం! మన వివాహలో మీ listing చూశాను — " if listing_url else
                      "నమస్కారం! మన వివాహ ప్రచార వివరాల్లో మీ వ్యాపారాన్ని చూశాను — ") + name)
    share_me_en = ("https://wa.me/%s?text=%s" % (wa_phone, quote(share_text_en)) if wa_phone else "")
    share_me_te = ("https://wa.me/%s?text=%s" % (wa_phone, quote(share_text_te)) if wa_phone else "")
    return {
        "vendor_id": vendor.get("id"), "variant": variant % len(telegram_variants_en),
        "telegram_post": telegram_variants_en[variant % len(telegram_variants_en)],
        "telegram_post_en": telegram_variants_en[variant % len(telegram_variants_en)],
        "telegram_post_te": telegram_variants_te[variant % len(telegram_variants_te)],
        "whatsapp_messages": whatsapp_en,
        "whatsapp_messages_en": whatsapp_en,
        "whatsapp_messages_te": whatsapp_te,
        "poster_text": poster_text_en,
        "poster_text_en": poster_text_en,
        "poster_text_te": poster_text_te,
        "category_en": cat_en,
        "category_te": cat_te,
        "channel_hint": channel or "Share manually to destinations you control; no channel or group is selected by this tool.",
        "channel_hint_en": "Share manually to destinations you control; this tool does not select a channel or group.",
        "channel_hint_te": "మీరు నిర్వహించే destination‌లలో మాత్రమే స్వయంగా పంచుకోండి; ఈ tool ఏ channel లేదా group‌ను ఎంచుకోదు.",
        "share_me": share_me_en,
        "share_me_en": share_me_en,
        "share_me_te": share_me_te,
        "external_delivery": "not_performed",
    }


# ---------------------------------------------------------------------------
# DASHBOARD (vendor ki performance report)
# ---------------------------------------------------------------------------
def vendor_dashboard(vendor_id: str) -> Dict:
    v = next((x for x in VENDORS if x.get("id") == vendor_id), None)
    if not v:
        return {"ok": False, "reason": "not_found"}
    my_leads = leads_for(vendor_id, limit=20)
    days_left = 0
    try:
        exp = datetime.fromisoformat(v.get("expires_at", ""))
        days_left = max(0, (exp - datetime.now()).days)
    except Exception:
        days_left = 0
    cat_peers = [x for x in VENDORS if x.get("category") == v.get("category") and is_active_listing(x)]
    is_share_kit = str(v.get("package", "")).upper() in SHARE_KIT_CODES
    kit_ready = is_ready_share_kit(v)
    kit_expired = is_share_kit and v.get("status") == "kit_ready" and not kit_ready
    return {
        "ok": True, "vendor": public_vendor(v), "package": PACKAGE_MAP.get(v.get("package"), {}),
        "package_mode": "share_kit" if is_share_kit else "directory_listing",
        "kit_ready": kit_ready, "kit_expired": kit_expired,
        "kit_expires_at": v.get("expires_at", ""),
        "days_left": days_left,
        "stats": {"impressions": v.get("impressions", 0), "clicks": v.get("clicks", 0),
                  "leads": v.get("leads", 0),
                  "ctr_pct": round((int(v.get("clicks", 0)) / int(v.get("impressions", 1)) * 100), 1)
                  if v.get("impressions") else 0.0,
                  "lead_rate_pct": round((int(v.get("leads", 0)) / int(v.get("clicks", 1)) * 100), 1)
                  if v.get("clicks") else 0.0},
        "recent_leads": my_leads,
        "competition": {"same_category_active": len(cat_peers),
                        "message_telugu": ("ఇది share-kit package; directory listing/placement ఇందులో లేదు."
                                           if is_share_kit else
                                           "మీ category లో %d active listings ఉన్నాయి — placement package బట్టి మారుతుంది; స్థిరమైన top position హామీ లేదు." % len(cat_peers))},
        "upsell_telugu": (
            ("✅ ఒకరోజు private share-ready kit approval తర్వాత 1 రోజు వరకు అందుబాటులో ఉంది; listing కాదు."
             if str(v.get("package", "")).upper() == "V_SINGLE_POST" else
             "✅ Share-ready materials private kit page లో ఉన్నాయి; public directory listing కాదు.")
            if kit_ready else
            "⌛ ఒకరోజు private share-kit access ముగిసింది; ఇది public directory listing కాదు."
            if kit_expired and str(v.get("package", "")).upper() == "V_SINGLE_POST" else
            ("⏳ %d days migilayi — renew చెయ్యండి (₹%d / %d days)"
             % (days_left, PACKAGE_MAP.get(v.get("package"), PACKAGE_MAP["V_BASIC"])["price"],
                PACKAGE_MAP.get(v.get("package"), PACKAGE_MAP["V_BASIC"])["days"]))
            if is_active_listing(v) else
            "Request ఇంకా review లో ఉంది లేదా public listing active కాదు."),
        "message_telugu": "📊 Impressions %s · Clicks %s · Enquiries %s — %s"
                          % (v.get("impressions", 0), v.get("clicks", 0), v.get("leads", 0),
                             "ఈ site లో నమోదు చేసిన గణాంకాలు" if int(v.get("leads", 0)) > 0 else "గణాంకాలు నమోదు అయినప్పుడు ఇక్కడ కనిపిస్తాయి"),
    }


# ---------------------------------------------------------------------------
# ADMIN
# ---------------------------------------------------------------------------
def vendor_queue(status: str = "pending") -> Dict:
    items = [v for v in VENDORS if (not status or v.get("status") == status)]
    items = list(reversed(items))
    return {"count": len(items), "total_amount": sum(int(v.get("package_price", 0)) for v in items),
            "items": [dict(v) for v in items[:100]],
            "slots": SLOTS}


def vendor_revenue() -> Dict:
    active = [v for v in VENDORS if is_active_listing(v)]
    pending = [v for v in VENDORS if v.get("status") == "pending"]
    paid_statuses = ("active", "expired", "kit_ready")
    by_pkg: Dict[str, Dict] = {}
    for v in VENDORS:
        if v.get("status") not in paid_statuses:
            continue
        p = by_pkg.setdefault(v.get("package", "V_BASIC"),
                              {"count": 0, "revenue": 0, "name": PACKAGE_MAP.get(v.get("package"), {}).get("name", v.get("package"))})
        p["count"] += 1
        p["revenue"] += int(v.get("package_price", 0) or 0)
    return {
        "vendors_total": len(VENDORS), "active": len(active), "pending": len(pending),
        "mrr": sum(int(v.get("package_price", 0) or 0) for v in active),
        "collected": sum(int(v.get("package_price", 0) or 0) for v in VENDORS if v.get("status") in paid_statuses),
        "pipeline": sum(int(v.get("package_price", 0) or 0) for v in pending),
        "by_package": by_pkg,
        "leads_total": len(LEADS),
        "leads_today": len([l for l in LEADS if str(l.get("at", "")).startswith(_today())]),
        "impressions": sum(int(v.get("impressions", 0)) for v in VENDORS),
        "clicks": sum(int(v.get("clicks", 0)) for v in VENDORS),
        "vendors_by_recorded_leads": [{"id": v["id"], "name": v.get("business_name"), "leads": v.get("leads", 0),
                                       "clicks": v.get("clicks", 0), "package": v.get("package")}
                                      for v in sorted(VENDORS, key=lambda x: -int(x.get("leads", 0)))[:5]],
        "renewals_due": [{"id": v["id"], "name": v.get("business_name"), "expires_at": v.get("expires_at")}
                         for v in active if _days_left(v) <= 7],
        "message_telugu": "🏪 %d active vendors · ₹%d collected · %d leads · %d enquiries ee రోజు"
                          % (len(active), sum(int(v.get("package_price", 0) or 0) for v in VENDORS
                                              if v.get("status") in paid_statuses),
                             len(LEADS), len([l for l in LEADS if str(l.get("at", "")).startswith(_today())])),
    }


def _days_left(v: Dict) -> int:
    try:
        return max(0, (datetime.fromisoformat(v.get("expires_at", "")) - datetime.now()).days)
    except Exception:
        return 0


def packages_public() -> Dict:
    """Public package copy avoids promises about external delivery or uptime."""
    raw_whatsapp = _digits(os.getenv("VENDOR_SALES_WHATSAPP", ""))
    contact_whatsapp = ""
    if len(raw_whatsapp) == 10:
        contact_whatsapp = "91" + raw_whatsapp
    elif len(raw_whatsapp) == 12 and raw_whatsapp.startswith("91"):
        contact_whatsapp = raw_whatsapp
    promo_kit_price = PACKAGE_MAP["V_SINGLE_POST"]["price"]
    listing_start = min(p["price"] for p in PACKAGES if p["code"] not in SHARE_KIT_CODES)
    return {
        "currency": "INR",
        "headline": ("One-day private share-ready promo kit starts at ₹%s; directory-listing/placement packages start at ₹%s. "
                     "No external post or reach is guaranteed." % (promo_kit_price, listing_start)),
        "headline_en": ("One-day private share-ready promo kit starts at ₹%s; directory-listing/placement packages start at ₹%s. "
                        "No external post or reach is guaranteed." % (promo_kit_price, listing_start)),
        "headline_te": ("ఒకరోజు private share-ready promo kit ₹%s నుంచి; directory listing/placement packages ₹%s నుంచి. "
                        "External post లేదా reach హామీ లేదు." % (promo_kit_price, listing_start)),
        "packages": PACKAGES, "addons": ADDONS_VENDOR, "slots": SLOTS, "categories": CATEGORIES,
        "how_it_works_telugu": [
            "1️⃣ Package ఎంచుకుని business వివరాలతో request submit చేయండి",
            "2️⃣ Checkout వివరాలు చూపితే వాటినే ఉపయోగించండి; వివరాలు లేకపోతే payment చేయవద్దు",
            "3️⃣ Payment reference మరియు listing వివరాలు review చేసిన తర్వాతే activation నిర్ణయం",
            "4️⃣ Promo text/poster tools share-ready material తయారు చేస్తాయి; external channel posting ఇందులో హామీ కాదు",
            "5️⃣ Enquiries dashboard లో నమోదు అవుతాయి; WhatsApp notification vendor number మరియు delivery setup ఉంటేనే ప్రయత్నిస్తాం",
        ],
        "how_it_works_en": [
            "Choose a package and submit your business details.",
            "Use checkout instructions only when they are displayed. Do not pay if instructions are unavailable.",
            "Activation is decided only after payment-reference and listing-details review.",
            "Promotional text and poster tools create share-ready material; external channel posting is not included or guaranteed.",
            "Enquiries recorded by the site appear in the dashboard. WhatsApp notification is attempted only when a vendor number and delivery setup are available.",
        ],
        "why_telugu": [
            "🔎 Category/location ఆధారంగా site directory లో business listing",
            "📣 కొన్ని packages కి configured website ad slots లో placement eligibility ఉంటుంది; fixed rank/reach హామీ కాదు",
            "📊 Site నమోదు చేసిన impressions, clicks, enquiries dashboard లో చూపుతాం",
            "📝 Promo text మరియు poster ను review చేసి మీరు స్వయంగా share చేసుకోవచ్చు",
            "🔒 Payment/listing review business లేదా వ్యక్తి identity, service quality, safety ని ధృవీకరించదు",
        ],
        "why_en": [
            "🔎 Business listings appear in the site directory by category and location after activation.",
            "📣 Eligible packages may enter configured website ad-slot rotation; fixed ranking or reach is not promised.",
            "📊 The dashboard reports impressions, clicks, and enquiries recorded by this site.",
            "📝 Review and share promotional text and posters yourself.",
            "🔒 Payment or listing review does not verify identity, service quality, or safety.",
        ],
        # Never substitute a generic support telephone number for a WhatsApp contact.
        "contact_whatsapp": contact_whatsapp,
        "external_distribution_promised": False,
    }


def vendor_stats() -> Dict:
    active = [v for v in VENDORS if is_active_listing(v)]
    counts: Dict[str, int] = {}
    for v in active:
        counts[v["category"]] = counts.get(v["category"], 0) + 1
    return {"total": len(VENDORS), "active": len(active),
            "pending": len([v for v in VENDORS if v.get("status") == "pending"]),
            "categories": len(CATEGORIES), "by_category": counts, "leads": len(LEADS),
            "impressions": sum(int(v.get("impressions", 0)) for v in VENDORS),
            "clicks": sum(int(v.get("clicks", 0)) for v in VENDORS)}
