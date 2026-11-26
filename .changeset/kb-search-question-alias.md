---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

`kb_search` now accepts `question` as another name for `query`, over MCP and on the CLI JSON route. Agents that call `kb_search` before its schema is in their prompt often send `question`; that call used to fail with `VALIDATION_FAILED`, and some hosts then printed the whole input schema back (about 5,000 characters). Input that sends both `query` and `question` is still refused, and the advertised schema still lists only `query`.

Technical summary: an input field can declare other accepted names with the `x-kibi-input-aliases` schema marker (`packages/cli/src/public/operations/input-aliases.ts`). `prepareOperationInput` and the MCP tool wrapper rename a declared alias to its field before validation when the field itself is absent; `advertisedInputSchema` drops the marker.
