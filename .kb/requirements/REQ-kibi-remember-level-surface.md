---
title: At level remember the MCP server lists no proof ingestion and kb_skills offers no provable-code skill
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: At level remember, the MCP server must not list kb_ingest_proof, and kb_skills must not offer the kibi-provable-code skill.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 8 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:28.568Z'
rationale: The approved two-layer plan has the tool listing and the skills follow the level, so an agent at level remember is not offered proof work the level does not ask for.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fc6b6353b0f9c0327f7c4a63c6aa865a2e2bf46d34afc2c85e23f536f1b3d12c
semantic_inventory:
  - claim_key: CLAIM-2A7B1E46C46EC223
    claim_text: At level remember, the MCP server must not list kb_ingest_proof
    role: normative
    status: modeled
    span:
      start: 0
      end: 63
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-remember-level-surface-c01 via requires_property.
  - claim_key: CLAIM-2A2DABF18D41AE66
    claim_text: kb_skills must not offer the kibi-provable-code skill
    role: normative
    status: modeled
    span:
      start: 69
      end: 122
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-remember-level-surface-c02 via requires_property.
logic_claims:
  - CLAIM-2A7B1E46C46EC223
  - CLAIM-2A2DABF18D41AE66
id: REQ-kibi-remember-level-surface
type: req
---
At level remember, the MCP server must not list kb_ingest_proof, and kb_skills must not offer the kibi-provable-code skill.

## Context

The approved two-layer plan has the tool listing and the skills follow the level, so an agent at level remember is not offered proof work the level does not ask for.
