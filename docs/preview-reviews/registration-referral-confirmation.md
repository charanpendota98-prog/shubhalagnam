# Registration referral confirmation

Local repair, not a release or real reward test.

The previous registration banner accepted an HTTP 500 reply with success:false when valid_code was truthy and a referrer name existed. Six intercepted English/Telugu cases at 320, 390 and 1280 pixels reproduced a verified-code claim and eligibility for 999 request credits. No real referral click, account, reward or credit was used.

The frontend now requires a completed HTTP 200 reply, exact success/ok/valid_code booleans, the matching clicked code or a validated canonical-code/alias pair, a nonempty string name and a nonnegative safe-integer credit count. Zero stays zero. Invalid responses do not become eligibility claims. Failed and malformed responses stay unconfirmed.

The banner has separate checking, invalid and unconfirmed states and a read-only retry. Refresh uses validation rather than repeating tracked clicks. Current-code epochs, cancellation, a 20-second network/body bound and unmount cleanup prevent old work from replacing the current referral. Storage denial falls back to read-only validation. Registration remains available; this does not attach a referral, grant credits or promise payout.

Validation:
- Six baseline reproduction cases.
- 37 new response-contract and browser cases, including bilingual failure/retry, invalid to confirmed zero, refresh without another tracking write, timeout/retry old-code reply isolation, body-read timeout and denied session storage.
- 61 adjacent email-confirmation, email-resend and registration-passkey cases.
- Correct-target production build, TypeScript and full lint/static checks passed. An initial node_modules symlink failed Next's filesystem-root check; a local dependency tree fixed the build setup. No product change was used to bypass it.
- Twelve new bilingual error/confirmed banner views were inspected at 320, 390 and 1280 pixels. Existing gift emoji and mixed Telugu in the confirmed-state copy remain separate presentation work.

All API writes in the browser tests were intercepted. Backend code, reward policy, delivery configuration and production records are unchanged. Native-device and actual member behavior are not proved by this work.
