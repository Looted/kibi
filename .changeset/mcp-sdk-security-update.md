---
"kibi-mcp": patch
---

kibi-mcp now depends on a version of the MCP SDK without a known high-severity vulnerability. Previously it allowed `@modelcontextprotocol/sdk` 1.30.0, which is affected by advisory GHSA-6qxp-vccf-f47h. Installs now resolve a fixed SDK release.

The `@modelcontextprotocol/sdk` dependency range moves from `^1.30.0` to `^1.32.1` (the advisory is fixed in 1.31.0 and later); `bun.lock` resolves 1.32.1. No Kibi API or behavior changes.
