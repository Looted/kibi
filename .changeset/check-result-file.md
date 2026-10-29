---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-core": patch
---

`kibi check` and the `kb_check` tool no longer fail with "Query exceeded bounded Prolog output capacity (ENOBUFS)" on a knowledge base whose violations JSON is larger than the engine's 8 MB answer limit. The engine writes the violations to a private temporary file and the command reads it from there, so the report is the same at any size.
