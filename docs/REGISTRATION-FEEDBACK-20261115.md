# Registration draft and feedback repair

Fresh full-wizard review confirmed duplicate short-About errors: validateStep(5) contained two copies of the same About checks. The duplicate block is removed. About's helper now says it is optional, with at least 50 characters when added, matching existing validation. The photo heading already says required, so its second screen-reader-only copy is removed.

The regression harness exposed a separate data-loss bug: autosave could replace a saved draft with the initial empty form after 700ms while the user was still deciding whether to Resume. Autosave now pauses while the saved-draft prompt is open. A delayed-resume check confirms the original synthetic draft remains after 950ms and restores step five. Password and consent remain deliberately unsaved and cleared on resume.

Pixel review caught the full-wizard bottom buttons being compressed into narrow columns at 320px. They now stack full-width on small screens and retain the row layout on larger screens. English and Telugu final action pixels inspected after the change.

Four EN/TE 320/1280 final-step cases cover delayed draft retention/resume, optional About helper, photo heading, one short-About error, non-compressed final action, no pageerrors, no API writes. Four new plus eight PR48 production-browser cases pass. Lint/static/security/build pass. Live reproduction used no photo, no consent and a blocked mutation path; no profile was created. This changes neither required registration data nor consent/photo/privacy enforcement.
