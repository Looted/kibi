---
"kibi-mcp": patch
"kibi-cli": patch
---

MCP discovery no longer dies when one tool hits the host timeout. Timed-out reads cancel in-flight work without tearing down the shared engine, so parallel `kb_status` / `kb_search` / `kb_query` calls stop cascading into `Kibi engine connection closed`. Healthy `kb_status` reuses the session engine. Discovery tools that opt into `agentVisibleStructuredData` embed JSON in `content` for hosts that hide `structuredContent`.

- MCP: abort-only on read tool timeouts; reset Prolog only for wedged mutations
- MCP: `adaptProlog` forwards AbortSignal to EngineClient query/status/save paths
- CLI: EngineClient settles pending RPCs once (abort vs response race-safe); cancel marks are per-connection
- CLI: `executeStatus` prefers `ensureProlog` / session port; pass AbortSignal through status/query/search
- MCP: opt-in `agentVisibleStructuredData` for kb_query/kb_search/kb_status only (preserves non-text content parts)
- Documented engine limit: cancel skips queued requests but cannot interrupt an already-running Prolog goal
