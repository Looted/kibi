---
"kibi-mcp": patch
---

Kibi's MCP server can be published under the GitHub owner's authorized Registry namespace. Its npm ownership metadata preserves the capital L in Looted, correcting the permission error that prevented Registry publication. Release preparation now keeps the Registry manifest version aligned with the npm package selected by Changesets.

- Match npm mcpName and server.json to io.github.Looted/kibi-mcp.
- Validate exact owner casing before packing or publishing release artifacts.
- Synchronize Registry versions alongside plugin manifests after Changesets versioning.
