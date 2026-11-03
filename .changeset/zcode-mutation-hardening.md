---
"kibi-zcode": patch
---

A dry-run `kb_upsert` through MCP no longer counts as a recorded decision, so the Stop hook still asks for the decision record after source edits that only validated an upsert. Hook state, workspace opt-in and hook-runner internals were simplified with identical behaviour otherwise.
