---
id: REQ-opencode-agent-mcp-only
title: Historical OpenCode MCP-only guidance (superseded)
status: superseded
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
source: documentation/requirements/REQ-opencode-agent-mcp-only.md
priority: must
owner: opencode-team
tags:
  - opencode
  - agent
  - mcp
  - policy
  - guidance
links:
  - type: depends_on
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: ADR-018
  - type: specified_by
    target: SCEN-opencode-agent-mcp-only
  - type: verified_by
    target: TEST-opencode-agent-mcp-only
  - type: relates_to
    target: REQ-opencode-smart-enforcement-v1
semantic_text: The OpenCode agent experience must:\n\nIn agent-visible guidance, name only the public MCP tools and sanctioned slash commands. The current public surface includes exact lookup (`kb_query`), discovery/reporting (`kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`), mutation (`kb_upsert`, `kb_delete`), validation (`kb_check`), candidate generation for bootstrap (`kb_plan_bootstrap`), and briefing generation (`kb_briefing_generate`).\nNever instruct direct `kibi` CLI usage for query, upsert, check, sync, init, doctor, branch, or gc flows.\nPrefer `kibi-bootstrap` for bootstrap in OpenCode; `/brief-kibi` is also sanctioned for start-task briefings backed by `kb_briefing_generate`. When more repair is needed, instruct the agent to ask the user/operator to perform it outside the agent session.\nDescribe background sync and validation as automatic plugin maintenance, not as agent actions.\nDirect `.kb/**` warnings toward public MCP tools rather than CLI flows.\nBe protected by regression tests that fail when forbidden CLI guidance reappears.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3b9c3f11bc2cb7d9c694b7ed70b30f0cf2b1e98e23fc3f6b9cb12ef9b465727a
semantic_inventory:
  - claim_key: CLAIM-96ECFE9BF42101E5
    claim_text: The OpenCode agent experience must:\n\nIn agent-visible guidance, name only the public MCP tools and sanctioned slash commands
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 126
  - claim_key: CLAIM-15738E1D53DE536E
    claim_text: The current public surface includes exact lookup (`kb_query`), discovery/reporting (`kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`), mutation (`kb_upsert`, `kb_delete`), validation (`kb_check`), candidate generation for bootstrap (`kb_plan_bootstrap`), and briefing generation (`kb_briefing_generate`).\nNever instruct direct `kibi` CLI usage for query, upsert, check, sync, init, doctor, branch, or gc flows.\nPrefer `kibi-bootstrap` for bootstrap in OpenCode
    role: descriptive
    status: missing
    span:
      start: 128
      end: 609
  - claim_key: CLAIM-DCF27799F28A5A70
    claim_text: '`/brief-kibi` is also sanctioned for start-task briefings backed by `kb_briefing_generate`'
    role: descriptive
    status: missing
    span:
      start: 611
      end: 701
  - claim_key: CLAIM-B04A9E566C23EE3C
    claim_text: When more repair is needed, instruct the agent to ask the user/operator to perform it outside the agent session.\nDescribe background sync and validation as automatic plugin maintenance, not as agent actions.\nDirect `.kb/**` warnings toward public MCP tools rather than CLI flows.\nBe protected by regression tests that fail when forbidden CLI guidance reappears
    role: condition
    status: ontology_gap
    span:
      start: 703
      end: 1066
logic_claims:
  - CLAIM-96ECFE9BF42101E5
  - CLAIM-15738E1D53DE536E
  - CLAIM-DCF27799F28A5A70
  - CLAIM-B04A9E566C23EE3C
type: req
---
Superseded historical guidance. The current peer-surface and host-routing contract is defined by REQ-agent-kibi-interface-selection and the canonical Kibi skills.
