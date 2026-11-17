---
title: The Kibi MCP tool catalog holds 17 default tools and two optional ones
status: open
priority: must
firmness: firm
semantic_text: The default Kibi MCP tool catalog shall hold 17 tools. The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status.
origin:
  kind: agent
  ref: 'Maintainer, 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Maintainer decision, 2026-11-17, approving this count change as worded: "Add kb_record to the defaults and pay for it with enum encoding: yes, both in the kb_record PR".'
  recorded_at: '2026-10-28T09:26:59.321Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ec70d69ce3f658ad079b551a3b9187db5edc6e0288731c40f6bd9869be6d66d8
semantic_inventory:
  - claim_key: CLAIM-613EE08AA64C3E95
    claim_text: The default Kibi MCP tool catalog shall hold 17 tools
    role: normative
    status: modeled
    span:
      start: 0
      end: 53
  - claim_key: CLAIM-86C95EB0D9054676
    claim_text: The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status
    role: normative
    status: modeled
    span:
      start: 55
      end: 126
logic_claims:
  - CLAIM-613EE08AA64C3E95
  - CLAIM-86C95EB0D9054676
id: REQ-kibi-mcp-tool-catalog
type: req
---
The default Kibi MCP tool catalog shall hold 17 tools. The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status.

## Context

The tool registry (TOOLS and OPTIONAL_TOOL_NAMES in packages/mcp/src/tools-config.ts) fixes which tools the Kibi MCP server can expose. These claims were split from REQ-kibi-mcp-tool-consolidation so each is proved against the registry itself; how the composite tools answer and when the optional tools register stay there.

## Source

Maintainer, 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"