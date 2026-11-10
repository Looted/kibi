---
title: Master CI only builds and publishes the bumped npm package versions
status: open
semantic_text: Master CI must build and publish newly bumped versions to npm. No commits may be made on master. Manual npm publish and manual version bumps on master are prohibited.
semantic_clauses:
  - Master CI must build and publish newly bumped versions to npm.
  - No commits may be made on master.
  - Manual npm publish and manual version bumps on master are prohibited.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 907c03b2ecbebe33a8dc2785860c0b36b869c90ed26576b395e3e76f5a6dd5f9
semantic_inventory:
  - claim_key: CLAIM-12E9B0C280564B80
    claim_text: Master CI must build and publish newly bumped versions to npm
    role: normative
    status: modeled
    span:
      start: 0
      end: 61
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-85D03F210F1F156B
    claim_text: No commits may be made on master
    role: descriptive
    status: modeled
    span:
      start: 63
      end: 95
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2FEAB3BA5BD8E311
    claim_text: Manual npm publish and manual version bumps on master are prohibited
    role: normative
    status: modeled
    span:
      start: 97
      end: 165
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-12E9B0C280564B80
  - CLAIM-85D03F210F1F156B
  - CLAIM-2FEAB3BA5BD8E311
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:53:33.245Z'
firmness: default
required_evidence: tested
tags:
  - release
  - automation
  - changesets
id: REQ-kibi-release-master-publishes-only
type: req
---
Master CI must build and publish newly bumped versions to npm. No commits may be made on master. Manual npm publish and manual version bumps on master are prohibited.

## Context

Master never changes the code it releases, so what is published is exactly what develop reviewed.



## Why this changed

Split from REQ-020, which held two behaviors: versioning through Changesets on develop, and master CI that only publishes. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
