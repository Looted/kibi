---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_upsert` and `kb_validate_upsert` of a value fact now spell out, in the result text, the required step for each other requirement on the same quantity (for a firm one, asking the person). They used to be only in `nextActions`, which hosts that show the model just the text never passed on.
