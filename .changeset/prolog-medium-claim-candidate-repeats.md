---
"kibi-core": patch
---

The schema 12 migration review now lists each claim candidate once, even when the test reaches a requirement through more than one scenario. Candidates are ordered by claim key, then by requirement. Proof contract claim issues are ordered by test and claim key, and an issue repeated in `proves` is reported once.
