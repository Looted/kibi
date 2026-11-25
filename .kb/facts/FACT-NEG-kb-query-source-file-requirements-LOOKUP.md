---
title: 'Forbidden: implemented requirements missing from file lookup'
status: active
fact_kind: property_value
subject_key: mcp.kb_query
property_key: implemented_requirements_missing_from_file_lookup
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:00:59.727Z'
id: FACT-NEG-kb-query-source-file-requirements-LOOKUP
type: fact
---
A lookup by file that leaves out the requirements its symbols implement tells the agent nothing governs the file.
