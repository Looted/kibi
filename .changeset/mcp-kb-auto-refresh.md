---
"kibi-mcp": patch
"kibi-cli": patch
---

MCP now re-validates the attached branch KB whenever the same-branch snapshot is externally rebuilt, so running `kibi sync --rebuild` no longer leaves a long-running server stuck on stale data. If refresh cannot be reconciled, requests fail fast with explicit `KbRefreshError` behavior instead of silently continuing from a stale attachment.

- Added formal docs for same-branch KB freshness detection in MCP, including stat-based stamps and fail-closed retry semantics.
- Clarified CLI behavior so `--rebuild` is documented as triggering MCP auto-refresh on unchanged branch attachments where applicable.
- Added KB entities/ADR/requirements evidence and symbol traceability updates for the MCP session refresh path.
