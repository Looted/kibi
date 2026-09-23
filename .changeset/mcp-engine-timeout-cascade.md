---
"kibi-mcp": patch
"kibi-cli": patch
---

MCP discovery no longer dies when one tool hits the host timeout. Timed-out reads cancel in-flight work without tearing down the shared engine, so parallel `kb_status` / `kb_search` / `kb_query` calls stop cascading into `Kibi engine connection closed`. Healthy `kb_status` reuses the session engine, and discovery tool text now includes the JSON payload so Cursor agents can see proof contracts even when the host hides `structuredContent`.

- MCP: abort-only on read tool timeouts; reset Prolog only for wedged mutations
- CLI: `executeStatus` prefers `ensureProlog` / session port; pass AbortSignal through status/query/search
- MCP: append envelope `data` JSON to discovery `content` text for host-visible agents
