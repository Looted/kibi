---
title: Symbol coordinates are generated, never authored
status: open
semantic_text: Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state. A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7f40ed0717327930d5113f049fd680d983bddeb7c4f74b318404f60c854fadd4
semantic_inventory:
  - claim_key: CLAIM-2E1D66B90856D0BC
    claim_text: Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E74E76450FD5233B
    claim_text: A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest
    role: normative
    status: modeled
    span:
      start: 132
      end: 291
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2E1D66B90856D0BC
  - CLAIM-E74E76450FD5233B
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:14:15.753Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - symbols
  - coordinates
  - sync
  - proof
  - review:context-missing
owner: platform-team
id: REQ-generated-coordinate-authoring
type: req
---
Callers must not author symbol coordinate fields through kb_upsert, because symbol source coordinates are generated compiler state. A source-first symbol upsert must preserve or regenerate valid coordinates in persisted RDF without copying coordinate fields into the authored symbol manifest.

## Context

The manifest extractor reads coordinates from the generated artifact, and a symbol upsert refreshes them, so no caller writes them by hand.



## Why this changed

Split from REQ-generated-coordinate-persistence, which held seven clauses about three behaviors: who may write coordinates, how sync treats the coordinate artifact, and how the artifact is published. Each child is one of those behaviors.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
