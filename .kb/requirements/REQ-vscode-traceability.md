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
semantic_text: The Kibi VS Code extension must provide traceability in both directions between the knowledge base and source code.
logic_claims:
  - CLAIM-90E0513C98F55FAB
semantic_clauses:
  - The Kibi VS Code extension must provide traceability in both directions between the knowledge base and source code.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3ba7e2e652c8dba837b1bb4a2d52abefb1b46b251d750da884ad933746a3b09d
semantic_inventory:
  - claim_key: CLAIM-90E0513C98F55FAB
    claim_text: The Kibi VS Code extension must provide traceability in both directions between the knowledge base and source code
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6). Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
---
- The Kibi VS Code extension must provide traceability in both directions between the knowledge base and source code.

## Why
Developers work in the editor, so the links between code and the KB should be navigable there in both directions, not only through an agent or the CLI. Inferred from: ADR-007 and ADR-annotation-strategy on the VS Code tree view and code actions.
