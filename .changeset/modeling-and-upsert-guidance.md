---
"kibi-cli": minor
"kibi-mcp": minor
---

`kb_model` with `mode: "predicates"` no longer proposes a second grounding for a claim the requirement already grounds, which used to fail the proposition-complete rule on every link. It now answers `already_grounded` with the existing links and, when a predicate fits, an ordered `replacementPlan` that swaps the grounding; every result also names the planned predicate fact id to link in `relationshipTarget`. Upsert validation errors now name every unknown property and point entity prose placed in `properties` (`body`, `text`, `description`, …) to `document.body`.

Predicate suggestion reads the requirement's `requires_property`, `requires_predicate` and `requires_rule` targets and their `claim_key` when `requirementId` is given; a match yields an empty `applyPlan`, no `relationshipPlan`, `existingGrounding`, and a `replacementPlan` of predicate-fact upsert, `kb_delete` of the old relationship, and a relationship-only requirement upsert. The output contract adds `already_grounded` and `review_nonlogical` to `recommendedAction`, plus `relationshipTarget`, `existingGrounding` and `replacementPlan`. The relationship plan instructions name the planned fact id. Root-level `additionalProperties` errors list all unknown keys and keep the `must NOT have additional properties` text. The kibi-bootstrap scenario example now carries a `document.body`, and `docs/modeling-cheatsheet.md` shows a scenario upsert.
