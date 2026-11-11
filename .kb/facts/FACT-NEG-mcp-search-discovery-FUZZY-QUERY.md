---
title: kb_query answers a partial id with a fuzzy match
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: mcp.discovery
property_key: query_exact_not_fuzzy
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-05T06:45:00.000Z'
id: FACT-NEG-mcp-search-discovery-FUZZY-QUERY
type: fact
---
kb_query treats a partial entity id as a loose match and returns the entity it resembles.
