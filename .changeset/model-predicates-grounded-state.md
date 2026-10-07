---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

`kb_model` with `mode: "predicates"` now tells you what to do with a requirement that is already grounded, instead of answering `already_grounded` for all of them. A grounded claim with no fitting schema gets `record_ontology_gap` and the `review:ontology-gap` observation plan again, one whose schema needs exact values gets `provide_argument_bindings` with the missing arguments, and one with a complete predicate gets the new `replace_grounding` action with its `replacementPlan`. After a bootstrap, which grounds every requirement, the ontology-gap lane is no longer silently skipped.

`recommendedAction` drops `already_grounded` and adds `replace_grounding`; `existingGrounding` remains the "already grounded" signal. An already grounded claim still gets no predicate `applyPlan` or `relationshipPlan` (a second grounding link fails the proposition-complete rule), but the ontology-gap observation plan and `recommendedPredicateSchema` are returned because an observation is not a grounding relationship. The warning that points at `replacementPlan` appears only when a replacement plan exists. kibi-usage 2.6.0 and kibi-bootstrap 3.6.0 describe the new actions; `docs/mcp-reference.md` documents them.
