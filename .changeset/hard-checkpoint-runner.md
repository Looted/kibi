---
"kibi-opencode": minor
---

OpenCode hard enforcement can now complete a plugin-owned checkpoint instead of relying on prompt guidance alone. Authoritative roots only pass when the exact dirty fingerprint has rendered hard guidance and the internal Kibi sync/check cycle succeeds; degraded authoritative roots fail closed with restoration guidance while non-authoritative roots continue to skip hard enforcement.

Technical summary:
- Add a hard Kibi checkpoint runner with scoped in-memory evidence, scheduler flush coordination, targeted-check validation, and 30-second timeout handling.
- Cover pass, sync failure, check failure, timeout, degraded, non-authoritative, and fingerprint-isolation behavior in opencode scheduler tests.
