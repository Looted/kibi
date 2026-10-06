---
title: KB merge workflow resolves PRs with the base branch driver and a proof-checked merge
status: open
priority: should
tags:
  - ci
  - merge
  - proof
  - kb
  - review:context-missing
semantic_text: |-
  The Kibi KB merge workflow must build the merge driver from the base branch.

  The Kibi KB merge workflow must not install the pull request branch dependencies before merging.

  Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries.

  The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge.

  The Kibi KB merge workflow must run the proof baseline check before pushing a merge.

  When the proof baseline check fails, the Kibi KB merge workflow must not push the merge.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7a86e9e5a0697f086d3725353f5e157b1f61290f09a321144f230d111da19c9e
semantic_inventory:
  - claim_key: CLAIM-F23EBD496387C5E3
    claim_text: The Kibi KB merge workflow must build the merge driver from the base branch
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
  - claim_key: CLAIM-2EE353F4577820C0
    claim_text: The Kibi KB merge workflow must not install the pull request branch dependencies before merging
    role: normative
    status: modeled
    span:
      start: 78
      end: 173
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
  - claim_key: CLAIM-9433A60CC6B0A5A0
    claim_text: Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries
    role: normative
    status: modeled
    span:
      start: 176
      end: 295
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
  - claim_key: CLAIM-40043D037193211D
    claim_text: The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge
    role: normative
    status: modeled
    span:
      start: 298
      end: 391
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
  - claim_key: CLAIM-6B4351693156C403
    claim_text: The Kibi KB merge workflow must run the proof baseline check before pushing a merge
    role: normative
    status: modeled
    span:
      start: 394
      end: 477
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
  - claim_key: CLAIM-F05F6D6F1413047B
    claim_text: When the proof baseline check fails, the Kibi KB merge workflow must not push the merge
    role: condition
    status: modeled
    span:
      start: 480
      end: 567
    payload_hash: 07d98788d0c59545339fa36aa4bf0d7f9b5a33e460786652947d4f0d251e19ad
logic_claims:
  - CLAIM-F23EBD496387C5E3
  - CLAIM-2EE353F4577820C0
  - CLAIM-9433A60CC6B0A5A0
  - CLAIM-40043D037193211D
  - CLAIM-6B4351693156C403
  - CLAIM-F05F6D6F1413047B
id: REQ-ci-kb-merge-resolution
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The Kibi KB merge workflow must build the merge driver from the base branch.

The Kibi KB merge workflow must refresh a lockfile that does not match the merged package manifests in the merge commit.

Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries.

The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge.

The Kibi KB merge workflow must run the pre-push proof check before pushing a merge.

When the pre-push proof check fails, the Kibi KB merge workflow must not push the merge.
