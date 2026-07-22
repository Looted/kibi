---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

CLI and MCP users now receive real requirement-modeling and predicate-suggestion plans through the same shared operation executors. Prolog-backed status and reports work reliably again, nested skill commands accept JSON input, and compatibility errors no longer block parity verification.

- Move modeling execution into `kibi-cli` and keep MCP handlers as thin adapters.
- Restore compatible Prolog query, validation, deletion, and error behavior.
- Align the MCP dependency range with the released CLI version and remove silent OpenCode catches.
