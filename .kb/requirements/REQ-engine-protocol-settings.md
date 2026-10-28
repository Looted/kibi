---
title: Engine protocol version and idle timeout
status: open
priority: must
firmness: firm
semantic_text: The engine protocol version shall be 1. The engine daemon shall stop after 600000 milliseconds idle.
semantic_clauses:
  - The engine protocol version shall be 1.
  - The engine daemon shall stop after 600000 milliseconds idle.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:03:38.185Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2ba50fcbaf593deb79a296223eafe8aef0dad6087c85de52cdf84e5b7e7c524e
semantic_inventory:
  - claim_key: CLAIM-C5EC0AC1175F7801
    claim_text: The engine protocol version shall be 1
    role: normative
    status: modeled
    span:
      start: 0
      end: 38
  - claim_key: CLAIM-28EA5B8DC7DE84A7
    claim_text: The engine daemon shall stop after 600000 milliseconds idle
    role: normative
    status: modeled
    span:
      start: 40
      end: 99
logic_claims:
  - CLAIM-C5EC0AC1175F7801
  - CLAIM-28EA5B8DC7DE84A7
id: REQ-engine-protocol-settings
type: req
---
The engine protocol version shall be 1. The engine daemon shall stop after 600000 milliseconds idle.

## Context

packages/cli/src/engine.ts speaks a versioned protocol with the journaled engine REQ-core-journaled-engine-persistence keeps alive, and stops the daemon after an idle period. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"