---
"kibi-cli": patch
"kibi-mcp": patch
---

Adding or editing a symbol that lives in a decorated Python file no longer fails. With the Tree-sitter plugin active, `kb_upsert` aborted with "Cannot refresh incomplete source analysis … Python decorators are not evaluated" and rolled the write back, even though `kibi sync --refresh-symbol-coordinates` handled the same file. Upserts now bind the declaration the same way sync does, and coverage repair plans report those symbols as refreshable instead of failing.

When the Kibi MCP server keeps running after Kibi is upgraded or reinstalled, its tools used to fail with a bare "Cannot find module …" error. The error now says the server is running from files that are no longer installed and must be restarted, and that the project CLI works meanwhile.

- kibi-cli: targeted symbol coordinate refresh (`kb_upsert`) and `inspectCoordinateRepairs` pass `allowPythonDecoratorCoordinates`, matching `sync --refresh-symbol-coordinates`.
- kibi-mcp: legacy `kb_symbols_refresh` helpers pass the same flag; tool failures caused by missing modules carry a restart hint.
