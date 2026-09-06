---
"kibi-opencode": patch
---

OpenCode bootstrap capability detection can now be reset between tests so cached host probes do not leak across cases. Plugin behavior for operators is unchanged; only the test-facing cache helper is new.
