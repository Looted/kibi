---
"kibi-cursor": patch
---

Cursor plugin users can now enable Kibi without adding a separate project MCP configuration. The plugin finds the `kibi-mcp` version installed in the opened project, starts it inside that workspace, and reports a clear setup error when the dependency is missing. It never downloads or falls back to a global Kibi runtime.

- Replace the plugin MCP `npx --no-install` command with the packaged consumer-workspace launcher.
- Cover isolated and packed plugin launches, workspace selection, package-layout resolution, exit codes, and signal forwarding.
