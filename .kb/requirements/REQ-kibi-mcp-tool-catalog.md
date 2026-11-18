---
title: The Kibi MCP tool catalog holds 18 default tools and two optional ones
status: open
priority: must
firmness: firm
semantic_text: The default Kibi MCP tool catalog shall hold 18 tools. The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer, 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Maintainer decision, 2026-11-17, approving kb_record in the defaults: "Add kb_record to the defaults and pay for it with enum encoding: yes, both in the kb_record PR". Maintainer decision, 2026-11-17, approving kb_review_firm_edit as a listed tool and the count change: "Approve".'
  recorded_at: '2026-11-17T15:39:09.692Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 635b40def0c068e6e0157309756fb7ebc46ae6d8332cf89859629a595a908918
semantic_inventory:
  - claim_key: CLAIM-F3C444E68F357320
    claim_text: The default Kibi MCP tool catalog shall hold 18 tools
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
  - CLAIM-F3C444E68F357320
  - CLAIM-86C95EB0D9054676
id: REQ-kibi-mcp-tool-catalog
type: req
---
The default Kibi MCP tool catalog shall hold 18 tools. The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status.

## Context

The tool registry (TOOLS and OPTIONAL_TOOL_NAMES in packages/mcp/src/tools-config.ts) fixes which tools the Kibi MCP server can expose. These claims were split from REQ-kibi-mcp-tool-consolidation so each is proved against the registry itself; how the composite tools answer and when the optional tools register stay there.

## Source

Maintainer, 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"
