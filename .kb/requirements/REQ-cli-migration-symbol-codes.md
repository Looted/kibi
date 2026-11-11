---
title: Migration symbol codes
status: open
semantic_text: The legacy symbol link mark action id shall be symbol-legacy-link-mark. The legacy symbol link mark code shall be symbol_legacy_link_mark. Derived symbol coordinates shall start at KB schema version 13.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 09aae99dd2aa5d0417ccb788fe33db8d8283ad606697cb68a0f486be63f36b10
semantic_inventory:
  - claim_key: CLAIM-AE6690A5E75ECDEF
    claim_text: The legacy symbol link mark action id shall be symbol-legacy-link-mark
    role: normative
    status: modeled
    span:
      start: 0
      end: 70
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8265F23C3E6C3DC2
    claim_text: The legacy symbol link mark code shall be symbol_legacy_link_mark
    role: normative
    status: modeled
    span:
      start: 72
      end: 137
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-6C377382E2EA545C
    claim_text: Derived symbol coordinates shall start at KB schema version 13
    role: normative
    status: modeled
    span:
      start: 139
      end: 201
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-AE6690A5E75ECDEF
  - CLAIM-8265F23C3E6C3DC2
  - CLAIM-6C377382E2EA545C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:11:24.835Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-cli-migration-symbol-codes
type: req
---
The legacy symbol link mark action id shall be symbol-legacy-link-mark. The legacy symbol link mark code shall be symbol_legacy_link_mark. Derived symbol coordinates shall start at KB schema version 13.

## Context

The legacy symbol link and symbol coordinate migrations declare these values.

REQ-cli-schema-migration has kibi migrate pin or acknowledge existing entities when a new check arrives, instead of failing a KB that was valid before. Every such step reports a stable code, superseded requirements close to a fixed status, and symbol coordinates left the manifest with KB schema 13. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-cli-migration-pin-codes, which held twelve codes declared by eight migration modules. Each child is the codes of one migration family, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
