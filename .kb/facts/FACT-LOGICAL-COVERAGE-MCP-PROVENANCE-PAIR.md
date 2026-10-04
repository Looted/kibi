---
id: FACT-LOGICAL-COVERAGE-MCP-PROVENANCE-PAIR
title: MCP schemas preserve paired claim provenance
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - logical-coverage
  - mcp
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - conditional_claim_provenance
  - preserved
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,conditional_claim_provenance,preserved)
polarity: assert
claim_key: CLAIM-3C684BC9D8615DF1
claim_text: MCP tool schemas must preserve conditional claim provenance requirements
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the MCP paired-provenance contract.
