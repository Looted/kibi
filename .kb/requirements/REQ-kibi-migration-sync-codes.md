---
title: Migration sync action codes
status: open
semantic_text: The migration sync action id shall be migration-sync. The migration sync code shall be migration_sync.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 25224957d602ca3194f1ccd7d237a462fdf3f6ecdd85f7d8ef2759561aa95793
semantic_inventory:
  - claim_key: CLAIM-AC4230B73B003ADA
    claim_text: The migration sync action id shall be migration-sync
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E19F7AFB24A77FE2
    claim_text: The migration sync code shall be migration_sync
    role: normative
    status: modeled
    span:
      start: 54
      end: 101
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-AC4230B73B003ADA
  - CLAIM-E19F7AFB24A77FE2
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:13:12.671Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-migration-sync-codes
type: req
---
The migration sync action id shall be migration-sync. The migration sync code shall be migration_sync.

## Context

This is the action kibi migrate plans to sync the store after lifecycle repairs.

REQ-kibi-kb-lifecycle-integrity has kb_check report lifecycle problems with stable codes an agent can act on: review codes for findings a person must judge and action ids and codes for repairs Kibi can apply. They are stated here so every code is proved against its constant.

## Why this changed

Split from REQ-kibi-lifecycle-check-codes, which held thirteen codes for three kinds of lifecycle action. Each child is the codes of one kind of action.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
