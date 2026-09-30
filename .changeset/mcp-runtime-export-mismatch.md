---
"kibi-mcp": patch
"kibi-runtime": patch
---

Kibi's MCP server starts again in OpenCode, Cursor, and Codex. `kibi-mcp@2.1.1` was published against `kibi-runtime@2.0.1`, which predates the result-envelope helpers the server now imports, so the server crashed on load with a missing-export error. `kibi-mcp@2.1.0` is unaffected and can be used until this release is out.

- Release `kibi-runtime` with `appendPayloadCountField` and `normalizeResultPayload` exported.
- Raise the `kibi-runtime` dependency floor in `kibi-mcp` (and `kibi-opencode`) to the release that includes them, so an older runtime can no longer satisfy the range.
