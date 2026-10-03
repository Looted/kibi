---
"kibi-core": minor
"kibi-cli": minor
---

Kibi no longer says "no conflict" when it could not tell. Numeric requirements are compared exactly, so "the total must be greater than 0" now conflicts with "the total is 0", and a requirement whose clauses are not all modeled is reported as an incomplete analysis instead of a clean pass. Rules written as typed logic are compared three-valued: contradiction, disjoint or unresolved.

- New `intervals.pl` decides one-variable numeric constraints exactly, including strict `gt`/`lt` bounds; `values_conflict/5` uses it for every operator pair.
- The proof ladder's contradiction stage returns `status: unresolved`, `outcome: analysis_incomplete` (reason `unresolved_propositions`) when the semantic inventory has unresolved propositions.
- `kb_model_requirement` and the strict-claim schema accept `gt` and `lt`.
- The modeling round trip keeps what it modeled: `kb_compile_intent` writes the full semantic inventory (`semantic_clauses`, `semantic_inventory`, inventory hash and `logic_claims`) onto the requirement step, runs a rolled-back what-if contradiction check over the whole plan, and `kb_apply_plan` repeats that check before any write. "may … only" clauses are classified as normative.
