---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

Every MCP session now loads about 15k fewer characters of tool definitions. `kb_upsert` used to advertise the full schemas of `proof_contract`, `proof_bindings` and `proof_receipts`, about 17k characters that nearly every session paid for and almost none used. These three fields are now advertised as one-line stubs. Kibi still validates input against the full contract, so nothing that was refused before is accepted now, and a rejection under one of these fields includes that field's full schema in the error message.

Operation specs can mark a schema node with `x-kibi-advertised-summary`. `advertisedInputSchema` (exported from `kibi-cli/operations` and `kibi-runtime`) replaces each marked node with a stub that has only its type and summary, and the MCP tool list uses it. `prepareOperationInput` adds one `<path> full schema: {...}` line for each marked field a rejected input breaks, on the CLI JSON route and on MCP alike. A new test caps the size of each advertised tool definition.
