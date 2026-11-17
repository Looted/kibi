---
title: The MCP server lists every tool unless the core profile is chosen
status: open
priority: must
required_evidence: tested
semantic_text: The MCP server must list every MCP tool unless the core tool profile is chosen. The core tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit, and also kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity. Under the core tool profile, the MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI.
rationale: 'Every tool is listed by default because an agent that has to reach an unlisted operation through the project CLI may not be able to run it: in benchmark sessions where the CLI could not run, agents looped looking for the firm-edit receipt and asked the person again. Claude Code and Codex load a tool''s schema only when the agent first calls it, so the full list costs little there. On a host that loads every schema up front, the core profile saves about 32,000 characters of tool schemas per session, at the price of sending the other operations through the CLI.'
tags:
  - mcp
  - tool-surface
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-17, approving this statement: "And yes, ok for the tool-profile wording." Maintainer decision, 2026-11-17, choosing the full tool set on every host with an opt-in smaller profile. Earlier: Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description. Maintainer decision, 2026-11-17, approving this count change as worded: "Add kb_record to the defaults and pay for it with enum encoding: yes, both in the kb_record PR".'
  recorded_at: '2026-11-17T18:48:39.246Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 389349a450a0ff45efc4157d828caf4ff4fb90a913d5d7afb0f64f09bc71778a
semantic_inventory:
  - claim_key: CLAIM-CA13AD582348339C
    claim_text: The MCP server must list every MCP tool unless the core tool profile is chosen
    role: exception
    status: modeled
    span:
      start: 0
      end: 78
  - claim_key: CLAIM-D4F4BDAAF64421B5
    claim_text: The core tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit, and also kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
    role: normative
    status: modeled
    span:
      start: 80
      end: 380
  - claim_key: CLAIM-1BECB4BB3E4A1516
    claim_text: Under the core tool profile, the MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI
    role: normative
    status: modeled
    span:
      start: 382
      end: 528
logic_claims:
  - CLAIM-CA13AD582348339C
  - CLAIM-D4F4BDAAF64421B5
  - CLAIM-1BECB4BB3E4A1516
id: REQ-mcp-default-tool-profile
type: req
---
The MCP server must list every MCP tool unless the core tool profile is chosen. The core tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit, and also kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity. Under the core tool profile, the MCP initialize instructions must name the tools that are not listed and say that they run through the project CLI.

## Why

Every tool is listed by default because an agent that has to reach an unlisted operation through the project CLI may not be able to run it: in benchmark sessions where the CLI could not run, agents looped looking for the firm-edit receipt and asked the person again. Claude Code and Codex load a tool's schema only when the agent first calls it, so the full list costs little there. On a host that loads every schema up front, the core profile saves about 32,000 characters of tool schemas per session, at the price of sending the other operations through the CLI.

Until 2026-11-17 the server listed the core tools by default and every tool only under a full profile, to cut the 130,000 characters of tool definitions a session loaded.

## Source

> Maintainer decision, 2026-11-17: "And yes, ok for the tool-profile wording."

> Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty.
