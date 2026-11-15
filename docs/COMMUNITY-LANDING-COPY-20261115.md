# Community landing-page copy repair

Fresh live English/Telugu review of community bride/groom pages found an English-only hero and a second English breadcrumb below the shared translated breadcrumb. The hero and main actions now use selected language, while the duplicate breadcrumb is removed. Community proper names are preserved.

The pricing action incorrectly pointed to the requests workspace; it now points to /pricing. Page metadata incorrectly described the ₹99 plan as five profiles. Current live /pricing and the community FAQ show five interest requests. This repairs the unit only, not a price or policy change. The separate-channel explanation also now describes the current and other role without reversing them for a groom page.

Eight EN/TE 320/1280 bride/groom cases cover language switching, one visible breadcrumb, plans destination, corrected metadata unit, no overflow or page errors. Eight new plus twelve PR48/49 production-browser regressions pass. Lint/static/security/build pass. Actual Telugu mobile and English desktop pixels inspected. No member, account, payment, provider, routing registry or channel settings change. No external link clicked or outbound message sent.

Not a claim that all Telugu prose across the site is translated. Existing mixed technical terminology and broader sweep remain follow-ups. The first browser test used an overly broad meta-description locator that encountered transient server/client descriptions; it now checks the plan-bearing metadata specifically.
