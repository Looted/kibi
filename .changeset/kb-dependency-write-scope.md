---
"kibi-mcp": patch
---

Refuse a `kb` scope on MCP tools that cannot read KB dependencies. `kb_upsert`, `kb_delete` and the other tools without a `kb` input used to drop the scope and act on the project's own KB; a call that names a KB dependency on one of them now fails with a message that dependencies are read-only.
