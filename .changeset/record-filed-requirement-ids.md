---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_record` treats an id as taken when any Markdown document under `.kb/requirements` (at any depth, under any name) holds it in its front matter, not only `.kb/requirements/<id>.md`. A requirement written by hand in a subdirectory and not synced yet is no longer shadowed by a second file with the same id.
