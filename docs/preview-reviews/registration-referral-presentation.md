# Registration referral banner presentation

Local repair after PR158. Not a release or reward-operation test.

The previous confirmed Telugu banner mixed English policy phrases into the explanation and relied on a system gift emoji. It also described zero-credit eligibility as a positive bonus. The existing PR158 baseline and corrected-response screenshots preserve those earlier views.

Only this banner changes. It uses the existing bundled decorative Gift SVG. Telugu policy text is plain Telugu; referrer names remain as provided. Positive confirmed counts remain exact, with eligibility conditional on a valid referral being attached during registration. A confirmed zero explicitly says zero and no bonus benefit. Credits are not represented as cash or contact access. Long referrer names and the eligibility badge wrap within the banner.

Validation:
- Correct8000-target production build, TypeScript and full lint/static/security checks passed. One combined command reached its outer time limit during lint; the complete lint/types run was repeated separately and finished. No failed or incomplete run is counted as complete.
- Six new English/Telugu tests at320,390 and1280 pixels cover exact two-credit eligibility, zero without fabricated bonus, SVG semantics, Telugu policy text,200-character names, no horizontal overflow and no write requests.
-37 adjacent referral confirmation, status, timeout, stale-code, refresh and denied-storage checks passed. An earlier outer timeout interrupted that command before completion; the complete37-case run passed separately.
-18 positive,zero and long-name panels were inspected. Two comparison boards preserve all18 views.

All API replies were intercepted. No backend, referral policy, tracked click, registration, reward, credit, delivery, credential or production record changed. The wider registration page still has separately tracked presentation work. Native-device and actual-member behavior are not proved.
