---
"kibi-cli": patch
---

`kb_check` with `sourceFiles`, `staged` or a working-tree diff returns a much smaller result. Each impact diagnostic used to come back three times in the structured result and twice in the text; it is now listed once under `impactDiagnostics`, and the text writes a suggestion shared by many diagnostics once. Technically: `qualityDiagnostics` no longer repeats entries of `impactDiagnostics`, and a migration plan review action for such a diagnostic carries `evidence.diagnostic` as `{ id, entityId, listedIn: "impactDiagnostics" }` instead of a copy.
