# Creator campaign tracking

Members and OTP-verified referral partners can create one named link per video or channel. Campaigns do not send posts or messages. Campaign QR images are generated in the browser. Include the supplied disclosure when sharing; format-specific disclosure rules still apply.

## Money and attribution

Campaign tracking does not change referral economics, payment handling or payout review. Registration alone is not cash. Each newly registered user is attributed only after the existing referral attachment succeeds, and only to an active campaign belonging to that same canonical referrer. Existing accounts cannot acquire a campaign by opening a link. Malformed tokens are rejected before registration writes. Paused/archived links may still open ordinary referral registration, but no new campaign attribution is added. Archived campaign history is retained and cannot be reactivated.

Reports contain aggregate clicks, registrations, count of current qualifying reward entries, and their recorded INR sum. Earnings come from the existing eligible ledger, excluding reversed entries; they are not an available-wallet or payout balance. No member/contact rows are returned. The signup flow carries the token in the URL only, not across unrelated later visits. Counts are recorded events, not unique people or guaranteed income. Links can be copied, so channel names are labels rather than proof of traffic origin.

## Storage and operations

The campaign satellite is `referral.STATE_FILE + ".campaigns.json"`. It is included in production storage-path checks and backup export/restore even when referral storage is outside the state directory. Writes use atomic replacement. Corrupt stores fail closed without overwriting their contents. There are at most 100 campaigns per referrer and 10,000 recent hashed click replay keys, with persistent aggregate counts. Raw IP/user-agent strings are not retained in this satellite. Click dedupe is a bounded abuse reduction, not fraud verification. Existing server-process and referral-store deployment assumptions still apply; this is not a distributed transactional store.

On rollback, leave the satellite and user attribution fields intact for forward compatibility. Restoring a backup has the same existing operator approval and pre-restore snapshot requirements. Do not create synthetic production members to test this feature.

## Verification

Run the creator value/store, API and real multipart-registration scripts in separate processes. They isolate all stores and block external network access during registration. The browser suite covers member controls, stale/error/auth handling, six bilingual responsive/axe samples, token/invite landing continuity, QR rendering and OTP-scoped partner access. Authenticated UI tests are local fixtures, not production member acceptance. The signup/reward/reversal tests exercise the application and existing reward ledger locally. Production verification remains bounded health, unauthenticated pages, protected-route rejection and state preservation unless a separate member-test grant is provided.
