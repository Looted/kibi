---
"kibi-mcp": patch
"kibi-cli": patch
---

Fixes around the MCP tool profiles and workspace routing:

- Under the `core` profile, a result step that names an unlisted tool (such as `kb_status` asking for `kb_plan_bootstrap`) now says how to run it through the project CLI.
- A `KIBI_MCP_TOOLS`, `kibi.mcpTools` or `.kb/setup.json` `mcpTools` value that names no profile (`default`, `minimal`) is named on stderr instead of silently listing every tool.
- A write sent with a `workspaceRoot` the server cannot reach fails with an error instead of writing to the server's own workspace.
- The managed agent instructions name `kb_review_firm_edit`, and the connect-an-agent page describes the full-by-default tool list.
