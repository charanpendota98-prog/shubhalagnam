# Header fit repair

Keep the existing compact menu through 1365px; show the existing full desktop navigation at 1366px and above. The previous 1280px breakpoint squeezed the signed-in English brand text into a36px box, letting its painted text overlap Matches.

At640px, the long member account plus Free Register also squeezed the brand. Keep the existing registration action in the compact menu and show its duplicate header pill from768px instead of640px. No destination removed and no redesign.

Four EN/TE signed-in/signed-out browser cases exercise11 widths each:320,390,640,768,1024,1279,1280,1365,1366,1440,1536. Check actual painted wordmark span positions against neighboring controls, no page overflow, correct menu breakpoint, and open/close state. Inspected1280 English member and1366 Telugu member pixels. Lint/static/security, TypeScript and build pass before packaging.

Limits: browser-only layout fixture, not actual member behavior or physical-device acceptance. The compact menu button now has an explicit44px minimum width/height that the shared reset cannot override. At widths below360px, a32px logo,6px logo gap and96px language toggle preserve the wordmark without overlap. All44 combinations assert the actual menu hit-box dimensions. Other readiness and approval gaps remain unchanged. No live redesign, backend, member-data, notification, email, payment, policy or provider change.
