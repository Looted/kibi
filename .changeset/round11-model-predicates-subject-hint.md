---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` `mode: "predicates"` now treats an explicit `subjectHint` as the planned subject when the requirement is not written yet or constrains nothing: the candidate gets that `subject_key`, `subject_pairing` is computed against it, and the planned predicate fact carries it, so after the requirement is written with `constrains` to that subject fact `kb_check` no longer reports `strict-req-fact-pairing` (previously the plan fell back to the `requirement.subject` placeholder). A `kb_model` parameter that belongs to another mode is no longer silently ignored: the result's `warnings` name it and the parameter to use instead (for example `subjectKey` in mode `predicates` points to `subjectHint`). The kibi-usage skill (2.12.0) updates the "new strict requirement with a predicate grounding" recipe: pass `subjectHint` with the subject fact's key, and send `specified_by` (requirement → scenario) in the requirement's write, not the scenario's.

Technical summary: `buildSuggestion` (`predicate-applyplan.ts`) computes `subject_key`/`subject_pairing` against `plannedSubjects` (the constrained subjects, else `[subjectHint]` when explicit, else none). `dispatchComposite` calls the new `foreignParameterWarnings`, which lists input keys another route of the composite declares but the chosen route does not, with per-operation equivalents (`subjectKey` ↔ `subjectHint`); they are appended to the routed payload's own `warnings` (strings, or `{ kind: "parameter_ignored", message, nextAction }` for `kb_model_requirement`) and to the text content. Skill mirrors regenerated.
