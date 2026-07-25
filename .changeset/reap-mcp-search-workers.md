---
"kibi-mcp": patch
---

Stopping Kibi MCP during an active search now cancels the Prolog work immediately instead of leaving shutdown blocked behind the request. Both SIGINT and SIGTERM complete graceful parent shutdown and reap the SWI-Prolog child.

- Register graceful shutdown for SIGINT as well as SIGTERM.
- Terminate the Prolog worker before awaiting in-flight request settlement.
