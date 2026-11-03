---
"kibi-codex": patch
"kibi-cursor": patch
---

A dry-run `kb_upsert` through MCP no longer counts as a recorded decision. Validating an upsert used to silence the end-of-turn reminder that the session changed source files and recorded nothing in the knowledge base.
