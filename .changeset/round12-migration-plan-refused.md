---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

A migration plan that `kb_apply_plan` refuses no longer looks like a success. Re-applying a proof-integration plan whose `.kb/proof/integrations.json` already exists (or one whose runner config changed since planning) used to return `status: "success"` with `outcome: "reconciliation_required"`, so an agent reading only the status thought it had worked. It now returns an error result (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `MIGRATION_PLAN_REFUSED`, `data.outcome: "refused"` and the refusal reason in the message; nothing was changed and nothing needs reconciling.

Technical summary: `kibi.migration-apply-result.v1` gains `outcome: "refused"` (with `closeout.taskOutcome: "blocked"`) for an application that applied no action and whose every failure was a `MigrationActionRefusedError`: the proof-integration executor's refusals, predicate-schema-alignment drift and malformed invocations, and an action code with no automatic executor. `reconciliation_required` keeps meaning an action failed without being refused. `toKibiResult` turns a refused migration result into an error envelope with effects `not_applicable`; the CLI JSON route now exits 1 for any error envelope it returns (also a rejected bootstrap plan), and the MCP tool wrapper sets `isError: true` for one. `docs/mcp-reference.md` documents each migration outcome and how `kb_delete` reports an authored-entity refusal (status success, `deleted: 0`, the reason in `errors`); `docs/error-reference.md` adds `MIGRATION_PLAN_REFUSED`; kibi-usage describes both.
