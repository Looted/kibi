---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

A requirement is no longer `tested` while a value class its typed claims predict is refused has no scenario. Kibi now derives edge cases from each `property_value` fact a requirement grounds a claim on: the bound and the class past it, zero, one and many for an integer count, each set member and the value outside the set, each with a predicted outcome and a stable `CASE-` id. A scenario covers a case when it is not a draft, expects the predicted outcome and assumes a value in the case's class. An uncovered rejection case gives the blocking `uncovered_case` proof gap, so a firm requirement falls below its `tested` evidence floor and `kibi check` fails `evidence-floor`; success cases are reported without blocking. The new `cases` proof stage lists every case with its coverage, `kibi coverage --cases` prints them, `kibi proof explain` names the assumption each uncovered case needs, and the repair plan gains a `case_scenarios` phase whose repairs carry upsert-ready draft scenarios (`caseSkeletons`). `kb_semantic_advisor` previews the cases of each strict-property suggestion in `casesPreview`. When the cases are covered another way, the grounding fact can record a `case_waiver` reason; it counts only once `case_waiver_approved_by` names the person who accepted it.

## Migration

No files change shape. Requirements that were `tested` with a numeric bound or a closed set and no scenario past the bound or outside the set now report `uncovered_case`. Run `kibi coverage --cases` or `kibi proof explain <REQ>`, then for each uncovered case add a scenario that `assumes` a fact in the case's class (for `files_per_batch lte 5`, a fact `files_per_batch eq 6`), `expects: rejection`, is linked with `specified_by` and is verified by a passing end-to-end test. The repair plan's `caseSkeletons` give the fact and draft scenario to start from; a draft never counts until it is made active. If the cases are covered another way, set `case_waiver` on the grounding fact and have a person approve it with `case_waiver_approved_by`.
