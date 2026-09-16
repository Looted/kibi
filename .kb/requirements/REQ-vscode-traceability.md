---
id: REQ-vscode-traceability
title: 'VS Code Extension Traceability: Umbrella'
status: open
created_at: 2026-02-18T00:00:00.000Z
updated_at: 2026-05-13T00:00:00.000Z
source: packages/vscode/
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - traceability
links:
  - type: specified_by
    target: SCEN-vscode-traceability-coverage
  - REQ-vscode-kb-to-source
  - REQ-vscode-source-to-kb
  - REQ-vscode-sidebar-kb-tree
semantic_text: The Kibi VS Code extension provides bidirectional traceability between the knowledge base and source code.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nNavigation from KB Tree to Source (REQ-vscode-kb-to-source)\nDiscovering KB Context from Editor (REQ-vscode-source-to-kb)\nStructural TreeView Sidebar (REQ-vscode-sidebar-kb-tree)
logic_claims:
  - CLAIM-95DF68E76EC233A1
semantic_clauses:
  - The Kibi VS Code extension provides bidirectional traceability between the knowledge base and source code.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nNavigation from KB Tree to Source (REQ-vscode-kb-to-source)\nDiscovering KB Context from Editor (REQ-vscode-source-to-kb)\nStructural TreeView Sidebar (REQ-vscode-sidebar-kb-tree)
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0d3e5ad2c9594613b8d8d2d97a49449c77337e6c007c887486877f046eec615d
semantic_inventory:
  - claim_key: CLAIM-95DF68E76EC233A1
    claim_text: The Kibi VS Code extension provides bidirectional traceability between the knowledge base and source code.\n\nThis requirement is an umbrella doc for the following granular behaviors:\nNavigation from KB Tree to Source (REQ-vscode-kb-to-source)\nDiscovering KB Context from Editor (REQ-vscode-source-to-kb)\nStructural TreeView Sidebar (REQ-vscode-sidebar-kb-tree)
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 364
type: req
---

The Kibi VS Code extension provides bidirectional traceability between the knowledge base and source code.

This requirement is an umbrella doc for the following granular behaviors:
1. Navigation from KB Tree to Source (REQ-vscode-kb-to-source)
2. Discovering KB Context from Editor (REQ-vscode-source-to-kb)
3. Structural TreeView Sidebar (REQ-vscode-sidebar-kb-tree)
