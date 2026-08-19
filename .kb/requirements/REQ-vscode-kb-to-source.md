---
id: REQ-vscode-kb-to-source
title: 'VS Code: Navigation from Tree to Code'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/vscode/src/treeProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - navigation
links:
  - type: specified_by
    target: SCEN-vscode-kb-to-source
  - type: verified_by
    target: TEST-vscode-traceability
semantic_text: |-
  The VS Code extension must support navigation from the KB tree to source code.

  Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line.
  Navigation coordinates must be resolved from `.kb/symbols.yaml`.
  The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation.
logic_claims:
  - CLAIM-60AC84FB14EB7772
  - CLAIM-C8FF2DA303615F0A
  - CLAIM-542BDD224890A05B
  - CLAIM-EF560B51A26D9FEA
semantic_clauses:
  - The VS Code extension must support navigation from the KB tree to source code
  - Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line
  - Navigation coordinates must be resolved from `.kb/symbols.yaml`
  - The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6c04b7b75cc0931fc2d7fb4146e74b41d7865035715e400e994cb39078ef52bf
semantic_inventory:
  - claim_key: CLAIM-60AC84FB14EB7772
    claim_text: The VS Code extension must support navigation from the KB tree to source code
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 77
    payload_hash: 1ef72b72cc635fa221a9fbfe7defd1b07d903ad3206e412287c72bcc8a01fbe0
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-C8FF2DA303615F0A
    claim_text: Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line
    role: normative
    status: ontology_gap
    span:
      start: 80
      end: 169
    payload_hash: 1ef72b72cc635fa221a9fbfe7defd1b07d903ad3206e412287c72bcc8a01fbe0
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-542BDD224890A05B
    claim_text: Navigation coordinates must be resolved from `.kb/symbols.yaml`
    role: normative
    status: ontology_gap
    span:
      start: 171
      end: 234
    payload_hash: 1ef72b72cc635fa221a9fbfe7defd1b07d903ad3206e412287c72bcc8a01fbe0
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-EF560B51A26D9FEA
    claim_text: The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation
    role: normative
    status: ontology_gap
    span:
      start: 236
      end: 355
    payload_hash: 1ef72b72cc635fa221a9fbfe7defd1b07d903ad3206e412287c72bcc8a01fbe0
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
type: req
---

The VS Code extension must support navigation from the KB tree to source code:

1. Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line.
2. Navigation coordinates must be resolved from `documentation/symbols.yaml`.
3. The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation.
