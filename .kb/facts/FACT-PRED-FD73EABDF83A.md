---
title: 'Predicate: plugin_launcher_contract(kibi_cursor_launcher,workspace_resolution_order,explicit_workspace_argument_then_workspace_folder_paths_then_kibi_workspace_then_cursor_workspace_then_validated_cwd)'
status: active
text_ref: .kb/requirements/REQ-cursor-consumer-local-mcp-launcher-v1.md
tags:
  - lane:ontology
  - predicate-suggestion
  - predicate:ontology
  - predicate:strict-semantics
  - predicate:plugin
  - predicate:launcher
fact_kind: predicate
predicate_name: plugin_launcher_contract
predicate_args:
  - kibi_cursor_launcher
  - workspace_resolution_order
  - explicit_workspace_argument_then_workspace_folder_paths_then_kibi_workspace_then_cursor_workspace_then_validated_cwd
canonical_key: plugin_launcher_contract(kibi_cursor_launcher,workspace_resolution_order,explicit_workspace_argument_then_workspace_folder_paths_then_kibi_workspace_then_cursor_workspace_then_validated_cwd)
polarity: assert
claim_key: CLAIM-4B9D0CF854836E8C
claim_text: 'It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp'
id: FACT-PRED-FD73EABDF83A
type: fact
---
