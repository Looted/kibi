---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_upsert` refuses a `document.path` under `.git` or `node_modules`, and reads a backslash in a relative `document.path` as a separator on every platform, so `.kb\adr\x.md` writes `.kb/adr/x.md` (as the receipt already reported) instead of a file with backslashes in its name.
