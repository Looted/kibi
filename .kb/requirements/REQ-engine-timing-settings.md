---
title: Engine idle check and exit grace
status: open
priority: must
firmness: firm
semantic_text: The engine daemon shall check for idleness every 30000 milliseconds. The engine shall give Prolog 1000 milliseconds to exit.
semantic_clauses:
  - The engine daemon shall check for idleness every 30000 milliseconds.
  - The engine shall give Prolog 1000 milliseconds to exit.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:45:45.106Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5788a9c68725fa70980f84e61af12789615f279bd8d61939e6ab4b1f87f719b4
semantic_inventory:
  - claim_key: CLAIM-6F3C9F99EC24CC90
    claim_text: The engine daemon shall check for idleness every 30000 milliseconds
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
  - claim_key: CLAIM-9393D46F1A874F0D
    claim_text: The engine shall give Prolog 1000 milliseconds to exit
    role: normative
    status: modeled
    span:
      start: 69
      end: 123
logic_claims:
  - CLAIM-6F3C9F99EC24CC90
  - CLAIM-9393D46F1A874F0D
id: REQ-engine-timing-settings
type: req
---
The engine daemon shall check for idleness every 30000 milliseconds. The engine shall give Prolog 1000 milliseconds to exit.

## Context

packages/cli/src/engine.ts checks the journaled engine REQ-core-journaled-engine-persistence keeps alive for idleness on an interval and gives Prolog a grace period to exit before it is stopped. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"