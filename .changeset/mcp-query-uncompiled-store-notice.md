---
"kibi-mcp": patch
---

`kb_query` over MCP now says when it answered from a branch store that was never compiled. Before, asking for an entity by id on a fresh branch returned "No entities found" with no warning, while `kb_search` on the same store already named the uncompiled store, so an agent could read the empty answer as "this requirement does not exist" and re-create it. Now the `kb_query` answer carries the same `branchStore` notice and the result envelope raises the `branch_store_not_compiled` warning, pointing at `kibi sync`.

Technical summary: the MCP `kb_query` tool handler now receives the operation context the runtime opened for the call (`handleKbQuery(prolog, args, context)`, mirroring `handleKbSearch`), so `createDiscoveryContext` carries the branch attachment that `executeQuery` needs to compute `uncompiledSearchNotice`. The `ToolsRuntime` type gains the optional `context` parameter and the fresh-branch consumer test asserts the notice, the warning diagnostic and the text hint before compilation, and their absence after `kb_apply_plan` compiles the store.
