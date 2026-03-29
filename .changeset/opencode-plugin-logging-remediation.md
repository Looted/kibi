---
"kibi-opencode": patch
---

Quieter terminal behavior: normal-operation logs now route through structured `client.app.log()` instead of `console.log`/`console.warn`. Error-class events (bootstrap-needed, sync/check failure, hook/init failure) remain visible in terminal. Preserved error visibility and hook compatibility for prompt injection.
