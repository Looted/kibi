---
title: The optional MCP tools are kb_sparql_remote and kb_job_status
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: optional_tools
operator: eq
value_type: set
value_set:
  - kb_job_status
  - kb_sparql_remote
claim_key: CLAIM-86C95EB0D9054676
claim_text: The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status
text_ref: REQ-kibi-mcp-tool-catalog
origin:
  kind: agent
  recorded_at: '2026-10-28T09:26:57.838Z'
id: FACT-mcp-optional-tool-names
type: fact
---
OPTIONAL_TOOL_NAMES in packages/mcp/src/tools-config.ts names the tools that register only when KIBI_MCP_OPTIONAL_TOOLS asks for them.