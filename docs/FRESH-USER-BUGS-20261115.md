# Fresh bug sweep: first repair batch, 15 November 2026

This is a bounded repair batch, not a claim that every route or workflow is bug-free.

## Reproduced on the live site

- `/admin/photos`: a valid owner/staff session did not start the queue GET unless a legacy admin key was present. The existing server already accepts the session. No permission change is needed.
- The photo queue showed a zero count before any successful fetch and could show an empty-success message while loading. Errors, auth loss and unreadable payloads must not mean an empty queue.
- At 320px, the photo key/Unlock/Refresh row broke button labels into narrow columns. Photo moderation actions also need enough width in Telugu.
- `/spotlight` in Telugu: the promotion badge contained an accidental Tamil-script word.
- Shared signed-out account card: the registration link promised "3 profiles" instead of the existing three free interest requests.

## Repair

Photo queue GET now runs on mount with existing same-origin credentials, independent of the legacy key. Legacy key access remains optional and does not fetch on every typed character. Loading, success, denied and error states are separate. Refresh clears old rows, obsolete results are ignored, malformed queue data is an error, and successful empty state says only that no photos currently await review. Refresh and key submission are disabled during a decision. Auth loss during an existing decision clears rows. No endpoint, role, photo moderation rule, payment rule or pricing was added or changed.

Controls wrap into readable rows, the optional key form stacks on small screens, and the photo card stacks before its actions become too narrow. Missing technical image metadata renders as unknown rather than "undefined". Existing approve/reject labels and reason options now use the selected language.

The badge is Telugu. The shared registration CTA describes free requests, without changing credits.

## Checks

- 12 new browser regressions: EN/TE at 320/390/1280, accessible photo controls, session-style queue load without key, no request on key typing, delayed/empty/error/retry/auth/malformed states, CTA wording and Telugu badge script.
- 18 existing owner command-center browser regressions rerun in the same final run: 30 passed.
- Frontend lint/static/security, TypeScript and production build passed.
- Synthetic fixture pixels were inspected. No real member photo was approved, rejected, uploaded or edited in verification.

## Sweep status

Fresh live route captures and read-only navigation checks continue separately under `fresh-sweep-20261115-2034`. Opening-state HTTP 200, image, console or overflow checks are not acceptance of every control, every private workflow or real-device behavior. Dynamic content, authenticated workflows and all error cases require their own checks. Remaining earlier privacy/incident/payment/channel constraints are unchanged.

## Release status

This document describes the candidate. Merge, deployment and live acceptance are recorded separately after they happen. Rollback must be staged, the complete standalone package independently cold-booted, and live EN/TE mobile/desktop pixels checked before calling this repair live and verified.
