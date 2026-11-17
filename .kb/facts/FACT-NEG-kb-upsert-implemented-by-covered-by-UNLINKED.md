---
title: A coveredBy test of an implementedBy entry is left without a covered_by link
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: implemented_by_covered_by_tests_left_unlinked
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - mutation
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: FACT-NEG-kb-upsert-implemented-by-covered-by-UNLINKED
type: fact
---
The failure side of the rule: kb_upsert accepts an implementedBy entry with coveredBy test ids but records no covered_by link to one of them.