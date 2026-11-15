---
"kibi-cli": minor
"kibi-mcp": minor
---

A `kb_check` scoped to the files an agent just edited now answers about that edit, instead of returning the whole KB. On a test project with a messy KB, the scoped check the hooks recommend returned 655,000 characters, almost all of it violations elsewhere in the KB and the full migration plan; it now returns about 22,000. Nothing is hidden silently: blocking violations outside the edit are counted in `omittedViolations`, `count` still includes them, and the summary says they still block the unfiltered check. The agent's own KB writes, store-level findings and every impact diagnostic are always listed. An unscoped `kb_check` and `kibi check --staged` are unchanged.

With `sourceFiles` and no `rules`, `violations[]` lists the violations on entities the changed symbols link to, on entities whose `.kb/` document differs from `HEAD`, on relationships with either end among those, on the checked files, and the store-level rules `branch-store-not-compiled`, `kb-consistency` and `source-relationship-parity`. The migration plan is still built from every violation and comes back as `migrationPlanSummary`; pass `includeMigrationPlan: true` for the full plan. A scoped result over 24,000 characters is cut (`truncated: true`, `truncation.hint`): advisory quality diagnostics become one `check_quality_truncated` count, then blocking violations past the budget are grouped in `violationGroups` by rule with up to 20 entity ids. New output fields: `omittedViolations`, `migrationPlanSummary`, `violationGroups`, `truncated`, `truncation`.
