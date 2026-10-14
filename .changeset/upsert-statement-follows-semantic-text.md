---
"kibi-cli": patch
"kibi-mcp": patch
---

A requirement updated with `kb_upsert` now states its new meaning in its Markdown body too. Before, an update that changed `semantic_text` without sending `document.body` left the old statement in the body, and `kb_search` quoted that old statement as the current decision, so a later agent could revert a change that was correctly recorded.

`kb_upsert` (and plan application, which renders documents the same way) replaces the non-context part of a requirement's body with the new `semantic_text` when the write changes it and sends no body. Context, Rationale, Source and the other context sections are kept byte for byte. An update that leaves `semantic_text` unchanged keeps the body as before.
