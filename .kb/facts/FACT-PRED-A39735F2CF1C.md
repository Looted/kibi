---
title: 'Predicate: process_delegation_contract(kibi_cursor_launcher,declared_kibi_mcp_bin,consumer_cwd,KIBI_WORKSPACE_and_inherited_environment,inherited_stdio,propagate_exit_and_signals)'
status: active
text_ref: .kb/requirements/REQ-kibi-consumer-local-plugin-launcher-ontology-v1.md
tags:
  - lane:ontology
  - predicate-suggestion
  - predicate:process
  - predicate:execution
  - predicate:contract
fact_kind: predicate
predicate_name: process_delegation_contract
predicate_args:
  - kibi_cursor_launcher
  - declared_kibi_mcp_bin
  - consumer_cwd
  - KIBI_WORKSPACE_and_inherited_environment
  - inherited_stdio
  - propagate_exit_and_signals
canonical_key: process_delegation_contract(kibi_cursor_launcher,declared_kibi_mcp_bin,consumer_cwd,KIBI_WORKSPACE_and_inherited_environment,inherited_stdio,propagate_exit_and_signals)
polarity: assert
claim_key: CLAIM-C117EBE7EABDFB20
claim_text: The launcher shall spawn the declared kibi-mcp bin with the consumer workspace as cwd and KIBI_WORKSPACE, preserve stdio, and propagate child exit codes and termination signals.
id: FACT-PRED-A39735F2CF1C
type: fact
---
