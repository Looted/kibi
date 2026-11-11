---
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-cli": patch
---

The MCP server now checks each Kibi operation's input against the same contract as the CLI JSON route. A field the operation does not define is refused instead of being silently dropped, and a value of the wrong type comes back as the coded `VALIDATION_FAILED` error envelope instead of a bare protocol message. Clients that sent extra fields must drop them. kibi-runtime exports `prepareOperationInput` for adapters.
