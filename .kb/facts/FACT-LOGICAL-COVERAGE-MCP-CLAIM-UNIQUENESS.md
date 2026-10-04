---
id: FACT-LOGICAL-COVERAGE-MCP-CLAIM-UNIQUENESS
title: MCP schemas preserve logical-claim uniqueness
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: .kb/facts/FACT-LOGICAL-COVERAGE-MCP-CLAIM-UNIQUENESS.md
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
  - logic_claim_uniqueness
  - preserved
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,logic_claim_uniqueness,preserved)
polarity: assert
claim_key: CLAIM-3CBD873F99A468BD
claim_text: MCP tool schemas must preserve logic-claim uniqueness constraints
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the MCP logic-claim uniqueness contract.
