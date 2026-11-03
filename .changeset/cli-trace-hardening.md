---
"kibi-cli": patch
---

Simplify internal traceability and plugin helpers (staged markdown validation, migration detection) without changing their behaviour. The pull request baseline check now fails when the Git snapshot cannot return the bytes of a protected file, instead of treating every unreadable file as unchanged. Impact review no longer stops with "Impact evidence is not JSON-safe" when a requirement has no text in its semantic source field (for example a title-only requirement).
