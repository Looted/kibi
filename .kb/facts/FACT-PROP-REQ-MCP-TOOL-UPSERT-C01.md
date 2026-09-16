---
title: The `kb_upsert` MCP tool must:\n\nAllow agents to create or update a single enti
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_mcp_tool_upsert
property_key: clause_01_the_kb_upsert_mcp_tool_must_n_nallow_agents_to_c
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_mcp_tool_upsert.clause_01_the_kb_upsert_mcp_tool_must_n_nallow_agents_to_c.eq.true
claim_key: CLAIM-8A6BF5268C7491AB
claim_text: The `kb_upsert` MCP tool must:\n\nAllow agents to create or update a single entity with its metadata.\nSupport batch creation of relationships to other existing entities in the same call.\nValidate relationship types against the supported canonical list.\nEnforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.\nTrigger a refresh of symbol coordinates if the upsert affects symbol linkage
id: FACT-PROP-REQ-MCP-TOOL-UPSERT-C01
type: fact
---
