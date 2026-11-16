# Partner preference lifecycle

- Preference checkpoint failure/exception now restores only partner_preferences and exp_filters, preserving unrelated member state, and returns503. No success before durable storage.
- My Account cannot edit default-looking data after a failed preference load; explicit retry is required. Save failures are localized rose role=alert, network uncertainty asks for reload, and saving always clears.
- Matches waits for session verification before Apply, restores saved min/max height alongside the existing mapped search fields, and reports failed loads rather than silently ignoring them.

Evidence: actual isolated password-cookie login, age27-34 and chosen heights save/reload/actual restart, exact applied age/height, other-member401, failed checkpoint503/exact prior state, retry200 and second actual restart retaining retry. Six EN/TE320/390/1280 browser cases exercise failed-load retry, HTTP/network save failure, retry success and exact applied age/height. Four backend regressions cover false/exception persistence with existing/absent preference fields and unrelated identity preservation. Pixels inspected for error semantics and applied age/height controls.

Boundaries: no real-member changes, sends, notifications, paid services, providers, policies, account changes, redesign or client send. Apply maps search-supported age/height/community/subcommunity/education/job/district/marital fields; this is not complete preference-engine parity. Income/diet/notes are not added to that mapping. No physical-device, Safari or screen-reader speech acceptance. Whole-site readiness and other authority gaps remain open.
