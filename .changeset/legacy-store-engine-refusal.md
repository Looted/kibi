---
"kibi-cli": patch
"kibi-mcp": patch
---

A branch whose KB store still sits at its old literal path is no longer wedged by running an ordinary command before `kibi migrate`. Every engine-backed command (`kibi query`, `kibi check`, `kibi search`, `kibi gaps`, `kibi coverage`, `kibi prove`, `kibi engine status` and others) started the KB engine, which serves only the new hashed store path: it created an empty store there, answered from it (queries returned nothing, checks passed), and left two stores that `kibi migrate`, `kibi sync` and `kibi query` then refused as ambiguous until the empty one was deleted by hand. These commands now stop with a message to preview the migration with `kibi migrate` and apply it with `kibi migrate --apply-safe <planHash>`, the engine itself refuses to open a branch whose only store is a legacy one, and `kb_apply_plan` over MCP no longer opens the session engine before the plan's legacy migration has run. `kibi status`, `kibi doctor` and `kibi migrate` keep working, and `kibi doctor` now recommends `kibi migrate` instead of `kibi branch recover` for a legacy store.

The plan `kibi migrate` previews for a legacy store no longer also schedules a branch store recovery, which used to rebuild the store the legacy migration had just moved.
