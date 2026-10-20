---
"kibi-mcp": patch
---

Successful tool calls in the diagnostic usage log no longer carry the `handler_error handler: Unhandled MCP handler error.` hint; their `tool_call.hint` is now empty.
