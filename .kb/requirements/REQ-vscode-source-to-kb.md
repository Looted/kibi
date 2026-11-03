---
id: REQ-vscode-source-to-kb
title: 'VS Code: Discovering KB context from editor'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/vscode/src/codeActionProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - discovery
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-vscode-source-to-kb
  - type: verified_by
    target: TEST-vscode-traceability
semantic_text: 'A registered symbol in the editor must offer a Kibi: Browse linked entities code action. Selecting the Browse linked entities action must open a Quick Pick listing the symbol''s related KB entities. A registered symbol must show a Code Lens with the count of its linked requirements and tests.'
logic_claims:
  - CLAIM-75378FB3662DB0F8
  - CLAIM-752145B6C3C726C4
  - CLAIM-84323746191FF72F
semantic_clauses:
  - 'A registered symbol in the editor must offer a Kibi: Browse linked entities code action.'
  - Selecting the Browse linked entities action must open a Quick Pick listing the symbol's related KB entities.
  - A registered symbol must show a Code Lens with the count of its linked requirements and tests.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 261262c88815a8b8d7061a88c1eb51f3df66295b97253f9fad703d934989d216
semantic_inventory:
  - claim_key: CLAIM-75378FB3662DB0F8
    claim_text: 'A registered symbol in the editor must offer a Kibi: Browse linked entities code action'
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
  - claim_key: CLAIM-752145B6C3C726C4
    claim_text: Selecting the Browse linked entities action must open a Quick Pick listing the symbol's related KB entities
    role: normative
    status: modeled
    span:
      start: 89
      end: 196
  - claim_key: CLAIM-84323746191FF72F
    claim_text: A registered symbol must show a Code Lens with the count of its linked requirements and tests
    role: normative
    status: modeled
    span:
      start: 198
      end: 291
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
---
- A registered symbol in the editor must offer a Kibi: Browse linked entities code action.
- Selecting the Browse linked entities action must open a Quick Pick listing the symbol's related KB entities.
- A registered symbol must show a Code Lens with the count of its linked requirements and tests.
