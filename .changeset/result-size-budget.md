---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Every operation result now keeps its data within 24,000 characters, on MCP and on the CLI JSON route alike. On a large KB, `kb_coverage` returned 5 MB by default and 21 MB with `limit: 500`, which hosts with a tool-result cap refuse.

- One shared fitter cuts list results (`kb_query`, `kb_search`, `kb_find_gaps`, `kb_graph`, `kb_sparql_remote`) to the rows that fit, always at least one. A cut result carries `truncated`, `truncation` (`returned`, `total`, `omitted`, `nextOffset`), a `RESULT_TRUNCATED` info diagnostic and a next action that repeats the call with the next `offset`. A single row past the budget is cut and names the parts it left out in `omittedFields`.
- `kb_coverage`, and `kb_query` without an `id`, return summary rows unless the call passes `fields: "full"`. `kb_coverage` returns `repairPlanSummary`, `symbolRepairPlanSummary` and `migrationPlanSummary` unless `fields: "full"`, reports `matched` (the rows its filters select), and fits its own result to the budget.
- A repeated `kb_coverage` call on an unchanged store reuses the computed report instead of recomputing it for every page.
- A `kb_check` with `rules` lists its findings in pages (new `offset` input) instead of in full. The `symbolDebt` file list fits into what the budget leaves and counts the rest in `filesOmitted`.
- `kb_graph` takes `offset` and reports `nodeCount`; `maxNodes` and `maxEdges` are capped at 2,000 and 5,000.
- A list or report read whose data is still over 64,000 characters is refused with `RESULT_TOO_LARGE`. Outputs with no smaller form, such as `kb_prepare_impact_review`, are returned whole.
- `kb_job_status` returns a finished job's data once instead of with its text.
- The `kibi coverage`, `report`, `signoff`, `migrate` and `query` commands still print the whole report.
