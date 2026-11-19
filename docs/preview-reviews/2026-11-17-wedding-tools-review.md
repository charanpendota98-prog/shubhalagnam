# Wedding tools preview review

17 November 2026. Local preview only. No push or deployment. The promised final working-version review before live remains a hold.

Review File (PRIVATE): https://files.instinct.com/0ejjoqvrfjsy-wedding-tools-checked-before-launch

## Scope and changes

- `/biodata`: larger studio controls and helper text, clear keyboard focus. Retains the 800px document/export canvas. A labeled, keyboard-focusable scroll region and visible note explain the full-size preview on phones; Edit details remains normal-width. Existing lookup, local editing, theme, optional photo, QR and JPG behavior remain.
- `/lagna-patrika`: larger controls and help, wrapping and focus. Blank fields stay blank until entered. Local theme and JPG export remain.
- `/muhurtham`: selected month exposes aria-pressed, a status announces the filtered count, and phone card actions/details stack and wrap. Fixed the nested teaser footer too. Existing date content remains unvalidated reference information requiring local confirmation, not a booking or astrology guarantee.
- `/pelli-choopulu`: larger controls/help and focus, retaining keyboard tabs and same-visit checklist state.
- `/porutham`: no-ID is Not checked. Failed and unknown reads do not falsely claim Not submitted. Previous status clears while another read loads. Failed upload retains the chosen file and shows its full name separately. Existing owner-scoped API, authorization and review semantics were not changed.
- Removed the repeated route context strip from these five pages. Scoped CSS does not enlarge biodata document content.

## Verification

- Production build passed after the final teaser fix.
- TypeScript check passed; git diff whitespace check passed.
- 6 browser journeys passed: Telugu and English at 320, 390 and 1280px. Each journey covers all five routes, so 30 route/viewport combinations were exercised. Checked no page-level horizontal overflow, filters/empty results, selected states, keyboard tabs, retained checklist choices, lookup failure, pending/failed/unknown/confirmed-not-submitted states, rejected upload retention and no uncaught page errors.
- 12 existing biodata/home regression cases passed: long-name exports, empty exports and segmented home controls.
- 86 existing security checks passed.
- Four actual JPG downloads were produced, two document types in both languages, and inspected as pixels. All data was empty or clearly fictional.
- Captured full-page and viewport screenshots across the 30 combinations; inspected representative body/canvas/failure views and the final 320px teaser fix. This is not a claim of exhaustive pixel-by-pixel inspection of every captured image.
- The review File was fully rendered/read at 320, 390 and 1280px. Its hosted preview images, scroll groups, fullscreen expansion, arrow navigation, focus and Escape were checked. An external source opened in a separate tab while the File remained available.

## Test isolation and limits

All browser test API responses were intercepted fixtures. The only attempted write was an intercepted, deliberately rejected fictional document upload. Nothing reached a real member account. Print was replaced by a local initiation counter; no physical print was tested. WhatsApp and device-native share were not sent or exercised end to end. No paid action, booking, service removal or provider activation occurred.

Read-only live comparison used these current public sources on 17 November:
- https://manavivaha.in/biodata
- https://manavivaha.in/lagna-patrika
- https://manavivaha.in/muhurtham
- https://manavivaha.in/pelli-choopulu
- https://manavivaha.in/porutham

The live no-ID horoscope screen still says Not submitted; the corrected state is preview-only. Calendar/astrology content, document authenticity and qualified review operations have not been independently validated. No compatibility calculation, certificate or review verdict was created. Prior policy/certificate/handling-time decisions remain open.

## Coverage

23 of 54 route patterns have now received the bounded previews listed in the coverage JSON. 31 remain, including six community-discovery routes next in the inventory. This is not whole-site completion or launch acceptance.
