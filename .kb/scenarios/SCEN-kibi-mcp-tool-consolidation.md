---
title: tools/list exposes 16 consolidated tools and composite calls match their routed operations
status: active
priority: must
tags:
  - mcp
  - tool-surface
  - composite-tools
  - parity
id: SCEN-kibi-mcp-tool-consolidation
type: scenario
---
# tools/list exposes 16 consolidated tools and composite calls match their routed operations

Given the Kibi MCP server started without KIBI_MCP_OPTIONAL_TOOLS
When a client lists tools
Then it sees 16 agent-facing tools, including kb_skills (action list/load/read) and kb_model (mode analyze/requirement/predicates), and neither kb_sparql_remote nor kb_job_status.

Given KIBI_MCP_OPTIONAL_TOOLS names kb_sparql_remote or kb_job_status
When the server starts
Then only the named optional tools are additionally registered.

When a client calls a composite tool
Then its result equals the routed catalog operation's payload plus the selector, and the narrower operations remain in the catalog and on the CLI.

When a client calls kb_upsert with dryRun true
Then nothing is written and both write effects are reported as skipped.
