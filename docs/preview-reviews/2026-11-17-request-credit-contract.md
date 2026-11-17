# Request-credit contract, 17 November 2026

## Bounded outcome

This local follow-up preserves the existing Terms/Refund promise instead of changing it to follow a configurable account setting. Decline returns one request credit once. Seven-day no-response expiry is a separate return path. These are request credits, not cash refunds. Existing eligibility, refund/response deadlines, receipt/tax commitments, stored consent and acceptance records are unchanged.

No production setting, historical balance, member record, provider, email or external channel was changed. Paid checkout stays off. Unrelated Safety anonymity wording is deferred.

## Findings and changes

- `backend/request_credit_policy.py` is a side-effect-free validator. Application import and production preflight both reject disabling decline returns or changing the seven-day interval. Defaults remain true and seven. The sample environment documents these invariants. No live environment value was inspected, so no claim is made that production previously disabled returns.
- Pricing, Requests, shared help/FAQ facts and backend account/help explanations now match the preserved promise, rather than describing decline returns as conditional on account policy. No public support identity/contact was added.
- Actual decline mutation/retry behavior was tested before editing. The suspected double-credit issue did not reproduce: the bucket helper reconciles to the raw balance before a retry. No credit-ledger rewrite was made.
- The expiry failure defect did reproduce: the API returned HTTP 200 and retained an in-memory expired/refunded state after core persistence failed. The new shared helper restores request/user state and returns HTTP 503 so the operation can be retried. All three production call sites (send, inbox, sent) use it. Expiry and response decisions share the existing request-expiry lock so the same record cannot be returned twice by a concurrent decline/expiry decision.
- The old privacy test previously accepted whichever decline policy was configured. It now expects the published one-credit return.

## Verification

- 12 focused backend tests passed. Actual local handlers, temporary stores, no outside network connections. Covers decline/repeated response, wrong owner, consent-save failure, core-save failure/retry, early and already accepted requests, separate expiry, expiry persistence failure/retry, concurrent decline/expiry, actual core-file persistence, policy validation and import rejection. These focused API tests use documented development auth, not live-account acceptance.
- Existing privacy/contact script: 123 pass, zero fail.
- Existing interest/anti-abuse script: 91 pass, zero fail.
- Existing production storage guard: 37 pass, zero fail.
- Actual production-entry/preflight regression passed with nondefault manifest parity across 40 paths, rejection of mock configuration before exec, and actual serve_production to uvicorn to HTTP 200 capabilities. Disposable initialized empty database, auth enforcement on, outside network blocked. This does not verify real provider delivery or production configuration.
- Production frontend build passed. TypeScript no-emit passed. Full lint/static/security command passed, including 86 security checks. The initial combined verification shell reached its execution limit during lint after the earlier steps completed; only the interrupted lint leg was rerun.
- Six focused browser cases passed in 32.9 seconds: English/Telugu at 320/390/1280 for Pricing and Requests, including rules and Plans/Credits. Mocked fictional API responses, no application writes or outside requests, no page errors or horizontal overflow. Changed copy, FAQ and plans sections were inspected as rendered pixels.
- Consolidated review page rendered at 320/390/1280 and read in complete bands. Hosted revision opened and new bilingual photo viewer, keyboard navigation/focus and Escape checked. All ten source images loaded; retained policy/journey evidence preserved. The new page is a guided screenshot review, not an interactive staging site.

## Same private review

https://files.instinct.com/vejzmlbctrmb-manavivaha-working-review-live-on-hold

Published generation 4, revision `filerevision-01M7N7RRR35M2FD6KC3TAYCEB7`. PRIVATE owner-only page access is unchanged. Its safe fictional-UI preview card and description are visible to anyone with the link.

Earlier complete-package cold-boot evidence belongs to the earlier 677cbbb application candidate and remains historical evidence, not an assertion that a new combined archive was packaged or tested after this follow-up. A future live release must build and verify its own exact package and actual environment. No full 586-case browser matrix or root 93-script backend matrix was run here.

## Owner context and remaining gate

The original 21:57 question and 22:08 approval authorized preparing factual corrections with existing rights/deadlines preserved and no deployment. Subsequent steering at 22:36 supported continuing the best-outcome local fix and final preview, not live approval. Original 22:36 message: `wamid.HBgMOTE2MzA0OTk2MDg4FQIAEhggQTUwOTcwREYxMTI1OUU1NjREMkY4RTY4NUQ4RDkyNEQA`.

Cherry said he personally handles support/refund complaints at 22:35, message `wamid.HBgMOTE2MzA0OTk2MDg4FQIAEhggQTU2NkRDQUZEMjBBRkNEQTQxNzE4MkMwRUFDNTdGNTAA`. This supplies the operator identity only, not mailbox receipt, monitoring coverage, a formal grievance-officer appointment or ability to meet every retained deadline. Those operational facts remain unverified. No repeat question, test email or new role/contact publication was performed.

Final before-live approval remains separate. No live release is authorized by these preview approvals.
