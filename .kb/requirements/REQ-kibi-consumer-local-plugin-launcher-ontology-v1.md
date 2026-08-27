---
title: Reusable Consumer-Local Plugin Launcher Resolution and Execution
status: open
priority: must
tags:
  - kibi
  - ontology
  - launcher
  - consumer-local
  - plugin
  - predicates
semantic_text: 'A published kibi-cursor plugin shall resolve and run only the kibi-mcp package installed in the consumer project, without downloading packages or consulting global or plugin-local runtimes. The launcher must resolve the consumer workspace by trying these named sources first in order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd contains project-local kibi-mcp. The launcher shall reject unresolved placeholders and ambiguous sets of multiple usable workspace roots with a clear error. The launcher shall resolve kibi-mcp through consumer-scoped Node package semantics, including exports-restricted and pnpm-style layouts, and shall reject packages outside consumer scope unless active package-manager semantics authorize them. The launcher shall spawn the declared kibi-mcp bin with the consumer workspace as cwd and KIBI_WORKSPACE, preserve stdio, and propagate child exit codes and termination signals. When the project-local kibi-mcp dependency is missing, the launcher shall report a concise actionable error outcome.'
semantic_clauses:
  - A published kibi-cursor plugin shall resolve and run only the kibi-mcp package installed in the consumer project, without downloading packages or consulting global or plugin-local runtimes
  - 'The launcher must resolve the consumer workspace by trying these named sources first in order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd contains project-local kibi-mcp'
  - The launcher shall reject unresolved placeholders and ambiguous sets of multiple usable workspace roots with a clear error
  - The launcher shall resolve kibi-mcp through consumer-scoped Node package semantics, including exports-restricted and pnpm-style layouts, and shall reject packages outside consumer scope unless active package-manager semantics authorize them
  - The launcher shall spawn the declared kibi-mcp bin with the consumer workspace as cwd and KIBI_WORKSPACE, preserve stdio, and propagate child exit codes and termination signals
  - When the project-local kibi-mcp dependency is missing, the launcher shall report a concise actionable error outcome
logic_claims:
  - CLAIM-DE59C964E152A960
  - CLAIM-179749472EB4BE33
  - CLAIM-220282AF6C04F1A1
  - CLAIM-E366DDB1014479CA
  - CLAIM-C117EBE7EABDFB20
  - CLAIM-7C2C6F8ACD2F8DA8
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0053e6480b04a37aa256e40a763f9d35aa7869222139ec676f9658199f35de87
semantic_inventory:
  - claim_key: CLAIM-DE59C964E152A960
    claim_text: A published kibi-cursor plugin shall resolve and run only the kibi-mcp package installed in the consumer project, without downloading packages or consulting global or plugin-local runtimes
    role: normative
    status: modeled
    span:
      start: 0
      end: 188
  - claim_key: CLAIM-179749472EB4BE33
    claim_text: 'The launcher must resolve the consumer workspace by trying these named sources first in order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd contains project-local kibi-mcp'
    role: normative
    status: modeled
    span:
      start: 190
      end: 426
  - claim_key: CLAIM-220282AF6C04F1A1
    claim_text: The launcher shall reject unresolved placeholders and ambiguous sets of multiple usable workspace roots with a clear error
    role: normative
    status: modeled
    span:
      start: 428
      end: 550
  - claim_key: CLAIM-E366DDB1014479CA
    claim_text: The launcher shall resolve kibi-mcp through consumer-scoped Node package semantics, including exports-restricted and pnpm-style layouts, and shall reject packages outside consumer scope unless active package-manager semantics authorize them
    role: exception
    status: modeled
    span:
      start: 552
      end: 792
  - claim_key: CLAIM-C117EBE7EABDFB20
    claim_text: The launcher shall spawn the declared kibi-mcp bin with the consumer workspace as cwd and KIBI_WORKSPACE, preserve stdio, and propagate child exit codes and termination signals
    role: normative
    status: modeled
    span:
      start: 794
      end: 970
  - claim_key: CLAIM-7C2C6F8ACD2F8DA8
    claim_text: When the project-local kibi-mcp dependency is missing, the launcher shall report a concise actionable error outcome
    role: condition
    status: modeled
    span:
      start: 972
      end: 1087
id: REQ-kibi-consumer-local-plugin-launcher-ontology-v1
type: req
---
A published kibi-cursor plugin shall resolve and run only the kibi-mcp package installed in the consumer project, without downloading packages or consulting global or plugin-local runtimes. The launcher must resolve the consumer workspace by trying these named sources first in order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd contains project-local kibi-mcp. The launcher shall reject unresolved placeholders and ambiguous sets of multiple usable workspace roots with a clear error. The launcher shall resolve kibi-mcp through consumer-scoped Node package semantics, including exports-restricted and pnpm-style layouts, and shall reject packages outside consumer scope unless active package-manager semantics authorize them. The launcher shall spawn the declared kibi-mcp bin with the consumer workspace as cwd and KIBI_WORKSPACE, preserve stdio, and propagate child exit codes and termination signals. When the project-local kibi-mcp dependency is missing, the launcher shall report a concise actionable error outcome.
