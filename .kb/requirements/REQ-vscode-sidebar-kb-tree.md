---
id: REQ-vscode-sidebar-kb-tree
title: 'VS Code: Structural TreeView implementation'
status: open
created_at: 2026-05-13T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/vscode/src/treeProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - treeview
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-vscode-sidebar-kb-tree
  - type: verified_by
    target: TEST-vscode-traceability
  - type: supersedes
    target: REQ-010
semantic_text: The VS Code extension must provide a TreeView in the sidebar to browse Kibi entities. The Kibi tree must group entities by type. The Kibi tree must let the user expand linked entities hierarchically, such as REQ to SCEN to TEST. The Kibi tree must refresh when the underlying KB snapshot changes.
logic_claims:
  - CLAIM-2CD71B7855197EF3
  - CLAIM-7E97A0DEB87515FD
  - CLAIM-AA7BDE71AA05484F
  - CLAIM-49172F2E2B1FB44E
semantic_clauses:
  - The VS Code extension must provide a TreeView in the sidebar to browse Kibi entities.
  - The Kibi tree must group entities by type.
  - The Kibi tree must let the user expand linked entities hierarchically, such as REQ to SCEN to TEST.
  - The Kibi tree must refresh when the underlying KB snapshot changes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 091093e1b53e475f7ad321ea7c511522b4a5c56fc86ac61ca563687efc94d7e1
semantic_inventory:
  - claim_key: CLAIM-2CD71B7855197EF3
    claim_text: The VS Code extension must provide a TreeView in the sidebar to browse Kibi entities
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
  - claim_key: CLAIM-7E97A0DEB87515FD
    claim_text: The Kibi tree must group entities by type
    role: normative
    status: modeled
    span:
      start: 86
      end: 127
  - claim_key: CLAIM-AA7BDE71AA05484F
    claim_text: The Kibi tree must let the user expand linked entities hierarchically, such as REQ to SCEN to TEST
    role: normative
    status: modeled
    span:
      start: 129
      end: 227
  - claim_key: CLAIM-49172F2E2B1FB44E
    claim_text: The Kibi tree must refresh when the underlying KB snapshot changes
    role: normative
    status: modeled
    span:
      start: 229
      end: 295
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
failure_side_waiver: "Structural tree rendering in the VS Code sidebar; nothing is refused."
failure_side_waiver_approved_by: Piotr Franczyk
firmness: firm
required_evidence: tested
rationale: "People need to browse the requirement, scenario and test chain where they write code, not only through the CLI."
---
- The VS Code extension must provide a TreeView in the sidebar to browse Kibi entities.
- The Kibi tree must group entities by type.
- The Kibi tree must let the user expand linked entities hierarchically, such as REQ to SCEN to TEST.
- The Kibi tree must refresh when the underlying KB snapshot changes.
