---
"kibi-swipl": patch
---

Build-manifest validation drops a redundant empty-string check on the bundle's home path; an empty home is still rejected, now by the normalized-path rule.
