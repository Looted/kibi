---
id: REQ-cli-status-pre-first-sync
title: CLI status returns machine-readable metadata before first sync
status: open
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
tags:
  - cli
  - discovery
  - status
links:
  - type: depends_on
    target: REQ-kibi-discovery-inspection
  - type: specified_by
    target: SCEN-cli-status-pre-first-sync
  - type: verified_by
    target: TEST-cli-status-pre-first-sync
semantic_text: Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed.
logic_claims:
  - CLAIM-11181E5550A15678
semantic_clauses:
  - Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 59e134c6bdedb736afc239b7d6a48893ea681d2ecd0dd8831abf5c0db805800d
semantic_inventory:
  - claim_key: CLAIM-11181E5550A15678
    claim_text: Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed
    role: normative
    status: modeled
    span:
      start: 0
      end: 183
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  recorded_at: '2026-10-04T01:17:15.284Z'
failure_side_waiver: "A capability claim: kibi status works right after init. Its opposite is only that the feature is missing."
failure_side_waiver_approved_by: Piotr Franczyk
firmness: default
required_evidence: tested
rationale: Lets tools and agents discover the KB and its status programmatically in a fresh environment.
---

Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed. This enables tools and agents to discover the KB presence and status programmatically in a fresh environment.

## Rationale
Lets tools and agents discover the KB and its status programmatically in a fresh environment.
