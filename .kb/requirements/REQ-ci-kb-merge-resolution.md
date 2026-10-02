---
title: KB merge workflow resolves PRs with the base branch driver and a proof-checked merge
status: open
priority: should
tags:
  - ci
  - merge
  - proof
  - kb
semantic_text: |-
  The Kibi KB merge workflow must build the merge driver from the base branch.

  The Kibi KB merge workflow must refresh a lockfile that does not match the merged package manifests in the merge commit.

  Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries.

  The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge.

  The Kibi KB merge workflow must run the pre-push proof check before pushing a merge.

  When the pre-push proof check fails, the Kibi KB merge workflow must not push the merge.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 273550d2e80a668a719b6a7fa3cab1bcdafb53454b87c61c11d889a3817469ab
semantic_inventory:
  - claim_key: CLAIM-F23EBD496387C5E3
    claim_text: The Kibi KB merge workflow must build the merge driver from the base branch
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
  - claim_key: CLAIM-15708CC40556996E
    claim_text: The Kibi KB merge workflow must refresh a lockfile that does not match the merged package manifests in the merge commit
    role: normative
    status: modeled
    span:
      start: 78
      end: 197
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
  - claim_key: CLAIM-9433A60CC6B0A5A0
    claim_text: Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries
    role: normative
    status: modeled
    span:
      start: 200
      end: 319
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
  - claim_key: CLAIM-40043D037193211D
    claim_text: The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge
    role: normative
    status: modeled
    span:
      start: 322
      end: 415
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
  - claim_key: CLAIM-7D52AEB0F0E427DB
    claim_text: The Kibi KB merge workflow must run the pre-push proof check before pushing a merge
    role: normative
    status: modeled
    span:
      start: 418
      end: 501
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
  - claim_key: CLAIM-A7F3E202CDAC826D
    claim_text: When the pre-push proof check fails, the Kibi KB merge workflow must not push the merge
    role: condition
    status: modeled
    span:
      start: 504
      end: 591
    payload_hash: ddcee2c11d2d3aefabd3bafea8bed0d74d2687c37a7631a26ec4d2067dd4bd05
logic_claims:
  - CLAIM-F23EBD496387C5E3
  - CLAIM-15708CC40556996E
  - CLAIM-9433A60CC6B0A5A0
  - CLAIM-40043D037193211D
  - CLAIM-7D52AEB0F0E427DB
  - CLAIM-A7F3E202CDAC826D
id: REQ-ci-kb-merge-resolution
type: req
---
The Kibi KB merge workflow must build the merge driver from the base branch.

The Kibi KB merge workflow must refresh a lockfile that does not match the merged package manifests in the merge commit.

Proof baseline reconciliation must derive the proof baseline summary counts from the proof baseline requirement entries.

The Kibi KB merge workflow must reconcile the proof baseline counts before committing a merge.

The Kibi KB merge workflow must run the pre-push proof check before pushing a merge.

When the pre-push proof check fails, the Kibi KB merge workflow must not push the merge.
