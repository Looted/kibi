---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-plugin-builtin": patch
"kibi-runtime": patch
---

Symbol coordinate refresh no longer treats `sourceFile` as an unrestricted filesystem path. Absolute paths and `..` escapes are rejected at upsert and refused at read time, so MCP/CLI coordinate refresh cannot probe files outside the workspace.

Tighten Prolog `sourceFile` typing to `workspace_relpath`, add `resolveWorkspaceSourceAbsolute` confinement (with realpath checks), and cover the escape oracle with regression tests in CLI and MCP.
