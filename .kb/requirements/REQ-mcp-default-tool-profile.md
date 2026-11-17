---
title: The MCP server lists seven tools by default and every tool in the full profile
status: open
priority: must
required_evidence: tested
semantic_text: The MCP server must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen. The MCP server must also list kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity. The full tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list every MCP tool. The MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI.
rationale: Every MCP session loaded all 16 tool definitions, about 130,000 characters of which about 71,000 reach the model, while a typical change uses the six tools that search, read, write, check and load skills. Listing those six by default cuts the definitions a session loads to about 46,000 characters; every other operation still runs through the CLI with the same input, and a project that wants them all listed chooses the full profile.
tags:
  - mcp
  - tool-surface
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description. Maintainer decision, 2026-11-17, approving this count change as worded: "Add kb_record to the defaults and pay for it with enum encoding: yes, both in the kb_record PR".'
  approved_by: maintainer
  recorded_at: '2026-11-16T20:00:00.000Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e3a734cc0c7e7ceb37d572084a8113fd34e4ce308a272ac7ade4e2f2217ce829
semantic_inventory:
  - claim_key: CLAIM-7DDAFB6E5A4B6A32
    claim_text: The MCP server must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen
    role: exception
    status: modeled
    span:
      start: 0
      end: 145
  - claim_key: CLAIM-756AC6B3EC9E1EC2
    claim_text: The MCP server must also list kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
    role: normative
    status: modeled
    span:
      start: 147
      end: 253
  - claim_key: CLAIM-53F4E7511CBC7D77
    claim_text: The full tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list every MCP tool
    role: normative
    status: modeled
    span:
      start: 255
      end: 380
  - claim_key: CLAIM-063456F19053E2B1
    claim_text: The MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI
    role: normative
    status: modeled
    span:
      start: 382
      end: 499
logic_claims:
  - CLAIM-7DDAFB6E5A4B6A32
  - CLAIM-756AC6B3EC9E1EC2
  - CLAIM-53F4E7511CBC7D77
  - CLAIM-063456F19053E2B1
id: REQ-mcp-default-tool-profile
type: req
---
The MCP server must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen. The MCP server must also list kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity. The full tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list every MCP tool. The MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI.

## Why

Every MCP session loaded all 16 tool definitions, about 130,000 characters of which about 71,000 reach the model, while a typical change uses the six tools that search, read, write, check and load skills. Listing those six by default cuts the definitions a session loads to about 46,000 characters; every other operation still runs through the CLI with the same input, and a project that wants them all listed chooses the full profile.

## Source

> Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.