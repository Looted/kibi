---
"kibi-mcp": minor
"kibi-cli": minor
"kibi-runtime": minor
---

A `kb_apply_plan` call with a plan but no `approvedPlanHash` (or a malformed or mismatched one) now fails the call itself over MCP, also with `async: true`. Before, MCP accepted it, returned a job receipt, and the error appeared only when polling `kb_job_status`. `kb_delete` likewise rejects a call that names both or neither of `ids` and `relationships`, as the CLI already did.

The MCP JSON Schema to Zod converter now enforces a `oneOf` whose branches are only `required`/`not`/`anyOf`/`allOf` key guards (exactly one branch must match) with the same condition matcher as `if`/`then`; the published input schema gains no top-level `oneOf`. In async mode the server runs the new `preflightApplyPlan` (exported from the CLI operations and kibi-runtime) before returning the receipt: it checks the approved hash, the plan shape and canonical hash, and for a bootstrap plan the branch, KB, workspace and source snapshots. The job repeats every check under the workspace lock.
