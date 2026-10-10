---
"kibi-mcp": patch
"kibi-cli": patch
---

`kb_check` over MCP now reports a branch whose store was never compiled the same way `kibi check` does: one blocking `branch-store-not-compiled` violation naming `kibi sync`, instead of one `source-relationship-parity` violation per authored relationship (hundreds on a real knowledge base). `kb_status` (MCP and CLI) reports `syncState: "stale"` instead of `"unknown"` when the store is missing while `.kb/` holds authored sources, and `kb_search` over MCP now names the attached branch in its answer scope.

Technical summary: the MCP `kb_check` registration passes the runtime operation context to `handleKbCheck`, which spreads it (branch attachment including a `KIBI_BRANCH` override, `fs`, `git`, `signal`, `clock`, `workspaceRoot`) into the check context, so `executeCheck` evaluates `uncompiledBranchStoreViolation`; an async (`kb_job_status`) check keeps its own abort signal. `handleKbSearch` likewise receives the context, so `buildSearchAnswer` gets `branchAttachment.kbBranch`. `executeStatus` sets `syncState: "stale"` for any `branch_store_not_compiled` reason, missing or empty store alike (a missing store without authored sources and an unreadable or incomplete store stay `unknown`); `kb_apply_plan`'s `closeout.kbState` follows (`stale` instead of `not_evaluated`). `docs/mcp-reference.md` no longer claims only `kibi branch ensure` creates a missing store.
