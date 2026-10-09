---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` mode `predicates` no longer lets an actor, role or owner be bound to the requirement's subject key. Binding hints offered the subject key for any naming argument, so an agent bound `actor = <subject key>` on a `permission_rule` and got a complete predicate whose actor said nothing the fact's `subject_key` did not already say. Subject keys are now offered only for the `subject` argument and for `entity` arguments; an explicit participant binding equal to a constrained subject key stays unbound with a reason, and when the claim names no participant the hint says so and points to `record_ontology_gap`.

Technical summary: `predicate-bindings.ts` adds `isParticipantArgumentType` (`actor`, `actor_scope`, `role`, `owner`) and `subjectKeyParticipantReason`, which `classifyBinding` applies to explicit and extracted values through the new `constrainedSubjects` binding context that `buildSuggestion` now passes; the hinted-first-argument shortcut no longer applies to a participant-typed first argument. `buildBindingHints` restricts subject-key examples to `subject` and `entity` arguments and replaces the "or the requirement's subject key" advice with no-participant guidance for participant arguments. `replacementPlan` (K20) now carries `expected.kbCheckAfterStep` listing both `logic-coverage` and `strict-req-fact-pairing` between the retraction and the link, `kbCheckAfterLastStep: []` and `rollbackWhen`, and its instructions and rollback reason state the rollback condition as a `kb_check` that is not clean after the last step. The kibi-usage skill (2.10.0) describes both.
