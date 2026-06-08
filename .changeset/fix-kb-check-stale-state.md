---
"kibi-mcp": patch
---

**Fix stale KB state in `kb_check` after runtime upserts.**

Previously, after `kb_upsert` wrote runtime relationships and called `kb_save`, the MCP session's TypeScript-side `attachedBranchStamp` was not updated to match the new disk state. When `kb_check` (or any other tool) subsequently called `ensureProlog()`, it detected a stamp mismatch and triggered a `kb_detach` → `kb_attach` refresh cycle. This reload unloaded the in-memory RDF graph and reloaded `kb.rdf` from disk — but because the TypeScript stamp was stale, the reload happened even though the disk already contained the runtime relationships. In environments where background syncs or other processes could modify `kb.rdf`, this caused `kb_check` to evaluate against an outdated snapshot instead of the live KB state.

**Changes:**

- **`packages/mcp/src/server/session.ts`**: Export `attachedBranchKbPath` and add `updateAttachedBranchStamp()` so mutation tools can keep the session stamp in sync after saves.
- **`packages/mcp/src/tools/upsert.ts`**: After `kb_save` succeeds, read the fresh disk stamp via `readBranchKbStamp` and update the session stamp. This prevents the next `ensureProlog()` call from triggering an unnecessary (and potentially destructive) refresh.
- **`packages/mcp/src/tools/check.ts`**: Add `prolog.invalidateCache()` at the start of `handleKbCheck`, aligning read-only check behavior with `kb_graph` and ensuring no stale query cache interferes with violation detection.
