---
title: At level remember the full MCP profile lists the knowledge tools, and the instructions name the rest as CLI commands
status: open
priority: must
required_evidence: tested
tags:
  - levels
  - mcp
  - tool-surface
semantic_text: At level remember, the full tool profile must list only kb_query, kb_search, kb_status, kb_skills, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit and kb_apply_plan, and also kb_plan_bootstrap and kb_compile_intent while the knowledge base holds no entity, and kb_prepare_impact_review and kb_author_impact_review while the project has an impact policy (.kibi/impact-policy.json). At level remember, the MCP initialize instructions must name every tool the session does not list, other than kb_ingest_proof, and say that it runs through the project CLI.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-26, approving the remember-level tool list statements (issue 892) as worded: "Approve both as worded" (decision card, 10:26Z). Requested as: Maintainer request, 2026-11-26: "Also could we address issue 892?" Issue 892: knowledge-layer sessions used five of the listed tools, and the first turn was about 3k tokens larger than without Kibi; move the tools only the verification layer uses out of the remember listing, keep bootstrap tools while the knowledge base is empty, keep every hidden tool reachable through the CLI, and keep the list the same in every harness.'
  recorded_at: '2026-11-26T10:29:09.696Z'
rationale: A session at level remember listed 18 tools, among them planning and proof-authoring ones that knowledge-layer sessions never used, and their definitions made the first turn about 3k tokens larger. The listing keeps every tool a knowledge-layer result hands work to (kb_model for unmodeled claims, kb_apply_plan for kb_model and kb_delete plans, kb_review_firm_edit for firm-edit findings), because an agent that must reach a tool through a CLI it cannot run loops or asks the person again.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c465cea50d7d0c7c39cce5add3e5793478a42c7fe29d4d1c672b1b0ff0a7887f
semantic_inventory:
  - claim_key: CLAIM-57E41B9D01805B44
    claim_text: At level remember, the full tool profile must list only kb_query, kb_search, kb_status, kb_skills, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit and kb_apply_plan, and also kb_plan_bootstrap and kb_compile_intent while the knowledge base holds no entity, and kb_prepare_impact_review and kb_author_impact_review while the project has an impact policy (.kibi/impact-policy.json)
    role: normative
    status: modeled
    span:
      start: 0
      end: 414
    subjects:
      - kibi.mcp.tool_catalog
  - claim_key: CLAIM-ADF36EDC9B0BCC4F
    claim_text: At level remember, the MCP initialize instructions must name every tool the session does not list, other than kb_ingest_proof, and say that it runs through the project CLI
    role: normative
    status: modeled
    span:
      start: 416
      end: 587
    subjects:
      - kibi.mcp.tool_catalog
logic_claims:
  - CLAIM-57E41B9D01805B44
  - CLAIM-ADF36EDC9B0BCC4F
id: REQ-kibi-remember-level-tool-list
type: req
---
At level remember, the full tool profile must list only kb_query, kb_search, kb_status, kb_skills, kb_graph, kb_model, kb_upsert, kb_record, kb_delete, kb_check, kb_review_firm_edit and kb_apply_plan, and also kb_plan_bootstrap and kb_compile_intent while the knowledge base holds no entity, and kb_prepare_impact_review and kb_author_impact_review while the project has an impact policy (.kibi/impact-policy.json). At level remember, the MCP initialize instructions must name every tool the session does not list, other than kb_ingest_proof, and say that it runs through the project CLI.

## Context

A session at level remember listed 18 tools, among them planning and proof-authoring ones that knowledge-layer sessions never used, and their definitions made the first turn about 3k tokens larger. The listing keeps every tool a knowledge-layer result hands work to (kb_model for unmodeled claims, kb_apply_plan for kb_model and kb_delete plans, kb_review_firm_edit for firm-edit findings), because an agent that must reach a tool through a CLI it cannot run loops or asks the person again.

## Source

> Maintainer decision, 2026-11-26, approving the remember-level tool list statements (issue 892) as worded: "Approve both as worded" (decision card, 10:26Z). Requested as: Maintainer request, 2026-11-26: "Also could we address issue 892?" Issue 892: knowledge-layer sessions used five of the listed tools, and the first turn was about 3k tokens larger than without Kibi; move the tools only the verification layer uses out of the remember listing, keep bootstrap tools while the knowledge base is empty, keep every hidden tool reachable through the CLI, and keep the list the same in every harness.
