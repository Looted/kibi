---
title: 'Predicate: ordered_resolution_strategy(kibi_cursor_launcher,explicit_workspace_arg|WORKSPACE_FOLDER_PATHS|KIBI_WORKSPACE|CURSOR_WORKSPACE|validated_cwd,cwd_contains_project_local_kibi_mcp)'
status: active
text_ref: .kb/requirements/REQ-kibi-consumer-local-plugin-launcher-ontology-v1.md
tags:
  - lane:ontology
  - predicate-suggestion
  - predicate:resolution
  - predicate:ordering
  - predicate:fallback
fact_kind: predicate
predicate_name: ordered_resolution_strategy
predicate_args:
  - kibi_cursor_launcher
  - explicit_workspace_arg|WORKSPACE_FOLDER_PATHS|KIBI_WORKSPACE|CURSOR_WORKSPACE|validated_cwd
  - cwd_contains_project_local_kibi_mcp
canonical_key: ordered_resolution_strategy(kibi_cursor_launcher,explicit_workspace_arg|WORKSPACE_FOLDER_PATHS|KIBI_WORKSPACE|CURSOR_WORKSPACE|validated_cwd,cwd_contains_project_local_kibi_mcp)
polarity: assert
claim_key: CLAIM-179749472EB4BE33
claim_text: 'The launcher must resolve the consumer workspace by trying these named sources first in order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd contains project-local kibi-mcp.'
id: FACT-PRED-7DF9B295814F
type: fact
---
