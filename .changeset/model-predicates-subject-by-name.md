---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` mode `predicates` no longer offers a predicate plan that `kb_check` would then reject. The requirement's subject now binds the argument a schema names `subject` wherever it sits, and for a schema without one (such as `permission_rule`) it is recorded as the planned predicate fact's `subject_key`; a predicate that is not about a subject the requirement constrains stays `provide_argument_bindings` with a hint instead of `replace_grounding` or `apply_requires_predicate`. A value taken from the claim for an actor, resource or other participant that is a long clause (more than three words) is no longer accepted as a binding.

Technical summary: `buildSuggestion` binds `subjectHint` or the single constrained subject into `argument_names.indexOf("subject")` and adds `subject_key` and `subject_pairing` (`paired`, `unpaired`, `not_required`) to each candidate; an unpaired candidate gets `subject` or `subject_key` in `unbound_arguments`, a `bindingHints` entry (position -1 for `subject_key`) and a warning naming the schema. `buildPredicateApplyPlan` writes `subject_key` on the planned fact when it is known, so `replacementPlan` step 1 carries it. `classifyBinding` treats an extracted value of an `entity`, `actor`, `actor_scope`, `resource`, `owner`, `role` or `component` argument with more than three snake-case words as a placeholder (`clauseBindingReason`), and the hint says why. The constrained subjects are now read even when `subjectHint` is passed. The kibi-usage skill (2.9.0) describes `subject_key` and short participant bindings.
