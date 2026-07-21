---
"kibi-cli": patch
"kibi-mcp": patch
---

Remote SPARQL SELECT queries now produce the same decoded rows through the CLI JSON route and MCP tool. Network access remains opt-in and HTTP(S)-only, while caller-provided timeouts retain their existing whole-second behavior.

- Share endpoint, query, timeout, request, and result-decoding logic through the CLI operation executor.
- Route CLI and MCP adapters through an explicit network port and verify parity against a local HTTP fixture.
