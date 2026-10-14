---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Fixes found by evaluating search and migration on a test project. A `kb_apply_plan` migration response no longer repeats every remaining review action: on a large KB it went from about 2 MB to a short digest, and the full plan stays one `kb_status`, `kb_check` or `kb_coverage` call away. `kibi migrate` no longer plans a second `kibi sync` that the `kb_status` plan does not have. `kb_search` gives words written in backticks (`canExport(user)`) more weight, so a requirement that names them among other things is no longer dropped, and an unlinked fact that disagrees with a governing requirement's fact now names the fact that holds.

- After an applied migration, `remainingPlan` is a `kibi.migration-plan-digest.v1`: the merged plan's hash, status, expected snapshots, scope, summary and diagnostics, every automatic action in full, and the other actions counted by code, safety and state. It cannot be applied; the `kibi migrate --apply-safe` summary reads it as before.
- `kibi migrate` adds `migration-sync` after a schema upgrade only when sources are rewritten or the status plan has no compile or resync after the upgrade.
- Intent search weighs the tokens of the question's backticked code spans twice in its lexical score, for the whole question and for each clause.
- An `ungoverned` predicate fact that shares the predicate, namespace and declared key arguments with a governing requirement's fact, with other arguments or polarity, carries `overriddenBy` (`fact`, `requirement`, `claim`), and the answer note names the pair.
