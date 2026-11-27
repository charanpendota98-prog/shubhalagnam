# Explicit NRI flag reads

A read-only production aggregate on November 27 found six stored member records, all with boolean false for is_nri. No other stored value type was present. The check returned counts only and changed no data.

Legacy code treated any truthy value as NRI, including strings such as false and no. Backend stored-flag reads accept true, integer 1, or case-insensitive trimmed strings 1/true/yes/on/y, matching the profile write side. Both frontend badge consumers accept the same values after API normalization, subject to the numeric transport boundary below. Invalid read values fail closed without throwing a write-validation error. Existing country and work-location inference is preserved on the backend; an explicit false stored flag does not override overseas evidence, as before.

The frontend shares one parser between ProfileView and TopPicks. The backend uses the corresponding read parser in hardening. No member data migration or rewrite is needed. Fictional tests cover false/no/off/zero/hostile flags, true spellings, country inference and inert country markup. This corrects classification, not verification of a member's self-reported overseas location.

This change is code-side only until a safe deployment disk path is approved.

Reader inventory: main._is_nri (public profiles/search/matches and other projections), quality.matches_filters (saved-search alerts), enterprise_sql.rebuild_search_projection (indexed v2 search), channels_config.route_profile (NRI category), and the two frontend badge consumers use the shared explicit-truth predicate for the stored flag. Country/work inference is retained where it already existed in main and quality; this change does not add country inference to the SQL projection or routing policy. Other routing preferences keep their existing parser and are outside this NRI-only change.

Unicode trimming is pinned to Python str.strip whitespace on both sides, including C1 separators and excluding FEFF. A cross-language executable test compares the literal accepted-value vectors. Python rejects a raw stored float 1.0, as does the strict write parser. JavaScript cannot distinguish JSON 1 from 1.0 after parsing. This latent numeric difference is unreachable for actual badge responses: public-profile, search and matches APIs call _is_nri first and emit a boolean; a test pins these normalization boundaries and the lexical collapse. No promise of equality for raw unnormalized numeric transport is made.

The hostile-flag browser checks wait for the rendered profile heading before asserting no badge. They are tested against a truthiness-reverted build. TopPicks is currently imported but not mounted by any page, so its parser wiring is checked statically; no browser coverage is claimed for that dormant component.
