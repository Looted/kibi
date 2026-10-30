---
title: Branch store and store lock settings
status: open
priority: must
firmness: firm
semantic_text: The detached HEAD read-only code shall be detached_head_read_only. The branch store manifest version shall be 1. The uncompiled branch store code shall be branch_store_not_compiled. The uncompiled branch store rule shall be branch-store-not-compiled. The store lock takeover record shall be .kibi-lock-takeover.json. A store lock takeover shall stay visible for 86400000 milliseconds.
semantic_clauses:
  - The detached HEAD read-only code shall be detached_head_read_only.
  - The branch store manifest version shall be 1.
  - The uncompiled branch store code shall be branch_store_not_compiled.
  - The uncompiled branch store rule shall be branch-store-not-compiled.
  - The store lock takeover record shall be .kibi-lock-takeover.json.
  - A store lock takeover shall stay visible for 86400000 milliseconds.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:42:17.659Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3e3910867f8274f71d6b086dfdf9986d822770efda2d4926dce8e12075061785
semantic_inventory:
  - claim_key: CLAIM-D4A9191F93A55F69
    claim_text: The detached HEAD read-only code shall be detached_head_read_only
    role: normative
    status: modeled
    span:
      start: 0
      end: 65
  - claim_key: CLAIM-D653A6B3705B105D
    claim_text: The branch store manifest version shall be 1
    role: normative
    status: modeled
    span:
      start: 67
      end: 111
  - claim_key: CLAIM-D88F66E3CFF971F6
    claim_text: The uncompiled branch store code shall be branch_store_not_compiled
    role: normative
    status: modeled
    span:
      start: 113
      end: 180
  - claim_key: CLAIM-EC8F5A3054D07502
    claim_text: The uncompiled branch store rule shall be branch-store-not-compiled
    role: normative
    status: modeled
    span:
      start: 182
      end: 249
  - claim_key: CLAIM-83C6984298F91C31
    claim_text: The store lock takeover record shall be .kibi-lock-takeover.json
    role: normative
    status: modeled
    span:
      start: 251
      end: 315
  - claim_key: CLAIM-68F4FC02E5AEE4E4
    claim_text: A store lock takeover shall stay visible for 86400000 milliseconds
    role: normative
    status: modeled
    span:
      start: 317
      end: 383
logic_claims:
  - CLAIM-D4A9191F93A55F69
  - CLAIM-D653A6B3705B105D
  - CLAIM-D88F66E3CFF971F6
  - CLAIM-EC8F5A3054D07502
  - CLAIM-83C6984298F91C31
  - CLAIM-68F4FC02E5AEE4E4
id: REQ-branch-store-settings
type: req
---
The detached HEAD read-only code shall be detached_head_read_only. The branch store manifest version shall be 1. The uncompiled branch store code shall be branch_store_not_compiled. The uncompiled branch store rule shall be branch-store-not-compiled. The store lock takeover record shall be .kibi-lock-takeover.json. A store lock takeover shall stay visible for 86400000 milliseconds.

## Context

REQ-branch-store-recovery-v4 serves a detached HEAD from a read-only snapshot and says so with a stable code. A branch store has a versioned manifest, an uncompiled store is reported under its own code and rule, and a taken-over store lock leaves a record that stays visible for a fixed time. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"