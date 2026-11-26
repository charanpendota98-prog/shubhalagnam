# Explicit NRI flag reads

A read-only production aggregate on November 27 found six stored member records, all with boolean false for is_nri. No other stored value type was present. The check returned counts only and changed no data.

Legacy code treated any truthy value as NRI, including strings such as false and no. Backend stored-flag reads and both frontend badge consumers now accept only explicit true values: true, integer 1, or case-insensitive trimmed strings 1/true/yes/on/y, matching the profile write side. Invalid read values fail closed without throwing a write-validation error. Existing country and work-location inference is preserved on the backend; an explicit false stored flag does not override overseas evidence, as before.

The frontend shares one parser between ProfileView and TopPicks. The backend uses the corresponding read parser in hardening. No member data migration or rewrite is needed. Fictional tests cover false/no/off/zero/hostile flags, true spellings, country inference and inert country markup. This corrects classification, not verification of a member's self-reported overseas location.

This change is code-side only until a safe deployment disk path is approved.
