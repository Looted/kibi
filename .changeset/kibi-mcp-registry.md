---
"kibi-mcp": patch
---

MCP clients can discover Kibi in the official MCP Registry and see the exact npm package version they will run. After Kibi publishes a new `kibi-mcp` version to npm, GitHub Actions will publish the matching registry metadata using GitHub OIDC.

- Add the official registry name to the npm package and describe its stdio transport in `packages/mcp/server.json`.
- Publish registry metadata only after the corresponding `kibi-mcp` npm package has been published successfully.
