---
"kibi-mcp": patch
---

The MCP server now reliably reports fresh status after a write in the same session. A same-version project-local kibi-mcp copy no longer causes the launcher to abandon the running local build for a published store copy, so local dogfooding and unreleased fixes are honored. `kb_status` also invalidates the Prolog query cache before evaluating, so it always reflects the current workspace state rather than a stale earlier-in-session result.

- Only re-enter the project-local kibi-mcp on a genuine version mismatch; matching versions keep the running build.
- Invalidate the PrologProcess query cache before `kb_status` so freshness is read-after-write consistent.
- Stabilize the same-session status test with polling and update resolution/mock tests.
