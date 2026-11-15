---
"kibi-cli": patch
---

`kibi migrate --apply-safe <hash>` now migrates a branch store that still sits at the old literal path, as `kb_apply_plan` already does over MCP. Before, the apply started the KB engine first; the engine serves only the hashed store path, so it created an empty store there, the run failed with "KB snapshot changed since planning", and the empty store then kept the legacy migration from being applied at all. The CLI apply now starts the engine only after the plan's legacy migration has moved the store, and refuses an action that needs the engine while the store is still at its old path.
