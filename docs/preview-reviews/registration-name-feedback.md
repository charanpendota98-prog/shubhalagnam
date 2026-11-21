# Registration name feedback, local verified, not live

Based directly on live PR153, independent of queued PR154-159.

The real Android step5 attempt received HTTP400. The read-only server validation ledger names full_name at2026-11-21T11:28:18 UTC. Persisted users match the pre-PR153 backup. No registration replay, deletion or external message was used.

The form checked only nonempty names while the deployed server requires2-60 English/Telugu characters with spaces, periods, apostrophes and hyphens. English hides the legacy mixed-language name error. This repair matches that existing rule before upload, explains it in both languages, returns a full-form name failure to step1 and recognizes the deployed legacy error. It does not expand or tighten backend policy. The actual entered name remains unconfirmed, so policy suitability is not signed off.

Production build targeting backend8000, TypeScript and full lint/static/security passed.21 new checks plus4 final-feedback checks and31 confirmation checks passed against the production build. Two outer-limited attempts are not counted; complete bounded runs superseded them. English/Telugu at320,390,1280 inspected. APIs intercepted, no production members or emails.

Photo suitability is separate: deterministic nonportrait noise passes the technical validator, but8 isolated backend policy tests confirm pending photos are not public and approval is not automatic. This PR does not claim face recognition or fix photo content acceptance.
