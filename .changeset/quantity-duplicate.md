---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": patch
---

KB schema 19: the new blocking `quantity-duplicate` rule catches one quantity stated under two names. Two active value facts, each grounded by a current requirement, state one quantity when their values are equal and comparable (numbers other than 0 and 1 after unit canonicalization, or sets of at least two members), their requirements are implemented in one source file, and a shared implementing symbol, a proof value source that implements the other requirement, or property keys or claim texts sharing half their words tie them. A value changed under one name used to leave the other stale with every check passing. A value fact can list the other's `subject_key.property_key` under `distinct_from` when the two are different quantities, and an entry that names no active value fact is reported. `kb_upsert` warns on a write that states a twin's quantity, on a requirement write that grounds one, and on a write or dry run that moves a value away from a twin still stating the old one. `kibi migrate` upgrades to schema 19 without rewriting anything and lists each pair as a `quantity_duplicate_review` action; until the upgrade runs, a KB on an older schema skips the rule.
