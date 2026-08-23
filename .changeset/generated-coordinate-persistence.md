---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Symbol coordinates no longer vanish when agents edit symbols, and a stale warm cache can no longer hide the damage. Editing a symbol through Kibi now keeps its exact code location in compiled knowledge, and when compiled state ever loses those coordinates while everything else looks unchanged, the approved coordinate refresh actually repairs it instead of reporting "Imported 0". Refresh failures now stop the operation loudly instead of being logged and ignored, so proof gaps appear immediately rather than after the next full rebuild.

- Source-first symbol upserts re-extract the canonical manifest + artifact entity before committing; authored `symbols.yaml` stays coordinate-free.
- Sync cache v2: workspace-root-relative keys, `symbol-coordinates.yaml` fingerprinted with its manifest, explicit refreshes forced through persistence, cache written only after durable save.
- Generated artifacts become identity-bound v2 records published atomically under a workspace symbol compiler lock; malformed artifacts fail closed everywhere.
- New MCP/CLI regression suites plus a Prolog proof-stage regression cover persistence, warm-cache repair, and fail-closed behavior.
