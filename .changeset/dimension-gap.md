---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

A requirement is no longer `tested` while a quantified claim is grounded only on its verdict. A claim that quantifies over a collection (`each`, `every`, `all`) or bounds a cardinality (`exactly`, `at least`, `at most`, `no more than`) must be grounded on what varies: an integer count or bound, a set of members, a rule over a variable, or a state machine. When every fact grounding it is a boolean `property_value` or a ground `predicate`, the requirement gets the blocking `dimension_unrepresented` proof gap, so a firm requirement falls below its `tested` evidence floor and `kibi check` fails `evidence-floor`. The new `dimension` proof stage lists each such claim with its quantifier and the typed groundings that would represent it, `kibi proof explain` prints them, and the repair plan gains a `dimension_grounding` phase. `kb_semantic_advisor` marks the same clauses with a `dimension` field on each proposition. When a quantifier word ranges over nothing ("start without all network access"), the grounding fact can record a `dimension_waiver` reason; it counts only once `dimension_waiver_approved_by` names the person who accepted it.

## Migration

No files change shape. Requirements that were `tested` with a boolean or ground-predicate fact behind an every/each/all or bounded claim now report `dimension_unrepresented`. Follow `kibi proof explain <REQ>` or the repair plan: replace the boolean with a typed fact from the claim's `rewrites` (for example `uninstrumented_files eq 0` or a rule over the files instead of `instruments_all_loaded_files eq true`), retype any failure-side assumption that opposed it so the requirement keeps its failure side, and re-run `kibi check`. If the quantifier word ranges over nothing, set `dimension_waiver` on the grounding fact and have a person approve it with `dimension_waiver_approved_by`.
