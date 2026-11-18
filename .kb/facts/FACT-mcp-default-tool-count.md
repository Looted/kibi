---
title: The default MCP tool catalog holds 18 tools
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: default_tool_count
operator: eq
value_type: int
value_int: 18
claim_key: CLAIM-F3C444E68F357320
claim_text: The default Kibi MCP tool catalog shall hold 18 tools
text_ref: REQ-kibi-mcp-tool-catalog
origin:
  kind: agent
  recorded_at: '2026-10-28T09:26:57.069Z'
id: FACT-mcp-default-tool-count
type: fact
---
TOOLS in packages/mcp/src/tools-config.ts is the Kibi MCP tool catalog. The server lists all of it unless the core tool profile is chosen; the core profile lists eight of these tools (and the bootstrap tools while the knowledge base is empty), and the rest run through the CLI.