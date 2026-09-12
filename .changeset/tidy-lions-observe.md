---
"kibi-mcp": patch
---

Server session state is now encapsulated behind accessor functions instead of live exported bindings. This is an internal robustness cleanup: the MCP server's mutable session state (Prolog worker, active branch, attached KB path, shutdown flag) previously lived in `export let` module bindings, which made state transitions invisible to consumers holding an old reference and made test resets fragile. Behavior, startup, branch switching, and shutdown semantics are unchanged.
