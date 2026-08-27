---
title: Cursor Plugin Resolves and Runs the Consumer-Local MCP
status: open
tags:
  - kibi
  - cursor
  - plugin
  - mcp
  - consumer-local
  - launcher
owner: cursor-team
priority: must
semantic_text: 'The published kibi-cursor plugin must resolve and execute the consumer project''s project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime. It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp; unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly. The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it. It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals. Missing project-local kibi-mcp must produce a concise actionable error.'
logic_claims:
  - CLAIM-9428F7588206E78D
  - CLAIM-4B9D0CF854836E8C
  - CLAIM-8B2BC645AFDF85B0
  - CLAIM-1FD7BA6027615B74
  - CLAIM-555607C28C9614A2
  - CLAIM-E9621DC5B1961F68
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c6967d2fe7b50fa0e24065dc386cdbe8733d50c3e979087544083755bbf49f99
semantic_inventory:
  - claim_key: CLAIM-9428F7588206E78D
    claim_text: The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime
    role: normative
    status: modeled
    span:
      start: 0
      end: 182
  - claim_key: CLAIM-4B9D0CF854836E8C
    claim_text: 'It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp'
    role: normative
    status: modeled
    span:
      start: 184
      end: 401
  - claim_key: CLAIM-8B2BC645AFDF85B0
    claim_text: unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly
    role: normative
    status: modeled
    span:
      start: 403
      end: 487
  - claim_key: CLAIM-1FD7BA6027615B74
    claim_text: The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it
    role: exception
    status: modeled
    span:
      start: 489
      end: 719
  - claim_key: CLAIM-555607C28C9614A2
    claim_text: It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals
    role: normative
    status: modeled
    span:
      start: 721
      end: 890
  - claim_key: CLAIM-E9621DC5B1961F68
    claim_text: Missing project-local kibi-mcp must produce a concise actionable error
    role: normative
    status: modeled
    span:
      start: 892
      end: 962
id: REQ-cursor-consumer-local-mcp-launcher-v1
type: req
semantic_clauses:
  - The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime
  - 'It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp'
  - unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly
  - The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it
  - It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals
  - Missing project-local kibi-mcp must produce a concise actionable error
---
The published kibi-cursor plugin must resolve and execute the consumer project's project-local kibi-mcp package without downloading packages or using a global or plugin-local runtime. It must resolve the consumer workspace in deterministic order: explicit workspace argument, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, CURSOR_WORKSPACE, then cwd only when cwd demonstrably contains project-local kibi-mcp; unresolved placeholders are invalid and ambiguous multiple usable roots fail clearly. The launcher must resolve kibi-mcp through consumer-scoped Node package semantics including exports-restricted and pnpm-style layouts, and reject packages outside consumer scope unless active package-manager semantics authorize it. It must spawn the declared kibi-mcp bin with cwd and KIBI_WORKSPACE set to the consumer workspace, preserve stdio, and propagate child exit codes and termination signals. Missing project-local kibi-mcp must produce a concise actionable error.
