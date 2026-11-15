---
"kibi-cli": patch
"kibi-mcp": patch
---

A project upgraded from an older Kibi, whose branch store still sits at the old literal path, can now migrate it by applying the plan `kb_status` previews. Before, `kb_apply_plan` could not run that plan: the MCP server refused every engine-backed tool while the old store was attached, and the plan's migration action left out the approval hash `kibi branch migrate --apply` requires. A plan that leaves the legacy migration unapproved is now refused, and a store that changed after its preview is not moved.

The `legacy_branch_storage` migration action now carries `--approval-hash` from the migration preview in its argv and evidence, so a changed legacy store changes the plan hash; it is only offered for a same-identity move onto a free hashed path, otherwise the plan shows a blocked operator action. `kb_apply_plan` refuses a plan while a legacy store is attached unless the plan is a migration plan approving that action, runs the legacy migration before other approved actions, and opens without the engine on the MCP server so the migration can run first.
