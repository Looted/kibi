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
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-vscode-kb-to-source
  - type: verified_by
    target: TEST-vscode-traceability
semantic_text: Clicking a symbol entity in the Kibi tree sidebar must open its source file at its line. The VS Code extension must resolve navigation coordinates from .kb/symbols.yaml and the generated .kb/symbol-coordinates.yaml. A symbol node in the Kibi tree must stay expandable to show its linked KB entities while it navigates to source.
logic_claims:
  - CLAIM-CD84B3CE96F03B5A
  - CLAIM-0C836E504D2BEBAE
  - CLAIM-B7E475F481023A75
semantic_clauses:
  - Clicking a symbol entity in the Kibi tree sidebar must open its source file at its line.
  - The VS Code extension must resolve navigation coordinates from .kb/symbols.yaml and the generated .kb/symbol-coordinates.yaml.
  - A symbol node in the Kibi tree must stay expandable to show its linked KB entities while it navigates to source.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9a955029bce94ad7b4f62ab31bf0edac802b40da8c06b1fa9f3247f6925b7ad9
semantic_inventory:
  - claim_key: CLAIM-CD84B3CE96F03B5A
    claim_text: Clicking a symbol entity in the Kibi tree sidebar must open its source file at its line
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
  - claim_key: CLAIM-0C836E504D2BEBAE
    claim_text: The VS Code extension must resolve navigation coordinates from .kb/symbols.yaml and the generated .kb/symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 89
      end: 214
  - claim_key: CLAIM-B7E475F481023A75
    claim_text: A symbol node in the Kibi tree must stay expandable to show its linked KB entities while it navigates to source
    role: normative
    status: modeled
    span:
      start: 216
      end: 327
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
---
- Clicking a symbol entity in the Kibi tree sidebar must open its source file at its line.
- The VS Code extension must resolve navigation coordinates from .kb/symbols.yaml and the generated .kb/symbol-coordinates.yaml.
- A symbol node in the Kibi tree must stay expandable to show its linked KB entities while it navigates to source.
