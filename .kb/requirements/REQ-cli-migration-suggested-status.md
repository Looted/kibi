---
title: Suggested status for legacy requirement status words
status: open
priority: must
firmness: default
semantic_text: A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected. A requirement marked accepted shall be migrated as open. A requirement marked proposed shall be migrated as open. A requirement marked draft shall be migrated as open. A requirement marked deprecated shall be migrated as retired. A requirement marked superseded shall be migrated as closed. A requirement marked rejected shall be migrated as retired.
semantic_clauses:
  - A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected.
  - A requirement marked accepted shall be migrated as open.
  - A requirement marked proposed shall be migrated as open.
  - A requirement marked draft shall be migrated as open.
  - A requirement marked deprecated shall be migrated as retired.
  - A requirement marked superseded shall be migrated as closed.
  - A requirement marked rejected shall be migrated as retired.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:39:29.290Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cad63061cca9b8cd143159e88700b0d0217f549d323032006ae999af7d709dfb
semantic_inventory:
  - claim_key: CLAIM-FF36BA3EB260FAB1
    claim_text: A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected
    role: normative
    status: modeled
    span:
      start: 0
      end: 103
  - claim_key: CLAIM-2A2859E538262E84
    claim_text: A requirement marked accepted shall be migrated as open
    role: normative
    status: modeled
    span:
      start: 105
      end: 160
  - claim_key: CLAIM-68AFEA49B161D179
    claim_text: A requirement marked proposed shall be migrated as open
    role: normative
    status: modeled
    span:
      start: 162
      end: 217
  - claim_key: CLAIM-36D64C508291EE50
    claim_text: A requirement marked draft shall be migrated as open
    role: normative
    status: modeled
    span:
      start: 219
      end: 271
  - claim_key: CLAIM-38995D2450ABEABA
    claim_text: A requirement marked deprecated shall be migrated as retired
    role: normative
    status: modeled
    span:
      start: 273
      end: 333
  - claim_key: CLAIM-11F2D31BA4DA22EE
    claim_text: A requirement marked superseded shall be migrated as closed
    role: normative
    status: modeled
    span:
      start: 335
      end: 394
  - claim_key: CLAIM-356408991377FEF1
    claim_text: A requirement marked rejected shall be migrated as retired
    role: normative
    status: modeled
    span:
      start: 396
      end: 454
logic_claims:
  - CLAIM-FF36BA3EB260FAB1
  - CLAIM-2A2859E538262E84
  - CLAIM-68AFEA49B161D179
  - CLAIM-36D64C508291EE50
  - CLAIM-38995D2450ABEABA
  - CLAIM-11F2D31BA4DA22EE
  - CLAIM-356408991377FEF1
id: REQ-cli-migration-suggested-status
type: req
required_evidence: tested
---
A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected. A requirement marked accepted shall be migrated as open. A requirement marked proposed shall be migrated as open. A requirement marked draft shall be migrated as open. A requirement marked deprecated shall be migrated as retired. A requirement marked superseded shall be migrated as closed. A requirement marked rejected shall be migrated as retired.

## Context

packages/cli/src/operations/migration/requirement-status.ts maps the lifecycle words REQ-cli-schema-migration meets on older requirements to open or closed. Each word and its suggested status are stated here so the mapping is proved against the table.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"
