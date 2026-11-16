# Matches toolbar fit

Keep the Filters label and count non-shrinking and on one line. Give the existing native sort control a16rem width and a full row below400px, allowing the complete selected option text rather than clipping it. No filtering/sorting rules or product behavior changed.

Four browser cases cover EN/TE with active/inactive filters at320,360,390,399,400,640,768,1024,1280px. For each width, exercise all three sort values, verify the outgoing search sort parameter, measure the selected text with its actual font plus padding/arrow allowance, verify the filter label occupies one line, no page overflow, and filter sheet open/close. Twelve focused tests including existing filter/registration cases pass; inspected320 English and390 Telugu age-sort pixels. Lint/static/security, TypeScript and build are required before final packaging.

Scope: isolated fixture UI and production asset delivery only, not actual live member acceptance or real-device/Safari/screen-reader speech acceptance. No redesign, member mutations, notifications, external sends, paid service, policy/provider/account change or client send. Existing readiness and permission limits remain open.
