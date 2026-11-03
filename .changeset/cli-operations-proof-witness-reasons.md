---
"kibi-cli": patch
---

Typecheck claim bindings that fail now keep the colon between "the set-equality witness" (or "the required-fields witness") and the TypeScript error, so the compiler's message reads as its own sentence again.
