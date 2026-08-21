---
title: 'Predicate: plugin_launcher_contract(kibi_cursor_launcher,child_process_execution,declared_kibi_mcp_bin_with_consumer_cwd_and_kibi_workspace_inherited_stdio_and_exit_signal_propagation)'
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
  - child_process_execution
  - declared_kibi_mcp_bin_with_consumer_cwd_and_kibi_workspace_inherited_stdio_and_exit_signal_propagation
canonical_key: plugin_launcher_contract(kibi_cursor_launcher,child_process_execution,declared_kibi_mcp_bin_with_consumer_cwd_and_kibi_workspace_inherited_stdio_and_exit_signal_propagation)
polarity: assert
claim_key: CLAIM-555607C28C9614A2
claim_text: It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals
id: FACT-PRED-FF255911CF23
type: fact
---
