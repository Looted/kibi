---
"kibi-cli": minor
"kibi-mcp": patch
---

A `kb_check` scoped to the files an agent just changed now answers about those files. Advisory findings from elsewhere in the knowledge base are counted in one line instead of listed in full, so a check after a small edit stays small. A changed function in a file that no requirement owns is now named as having no recorded intent, with the calls that link it to an existing requirement or record a new one.

- `kb_check` with `sourceFiles`: `qualityDiagnostics[]` keeps the impact findings, findings on the checked files, on their manifest symbols and on the entities those symbols link to. The rest is one `scoped_check_omitted_quality` info diagnostic with per-rule counts, which is not turned into a migration-plan action. `kb_check` without `sourceFiles` is unchanged.
- `symbol_semantic_review_needed` on a changed behavioral symbol in a file with no traceability-linked manifest symbol says no recorded intent covers it and suggests `kb_search` with the file as source location, then `kb_upsert` of a requirement with a scenario and an `implements` link, unless behavior is unchanged. Files with linked symbols keep the linked-coverage review wording.
