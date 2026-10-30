---
title: Decision firmness settings
status: open
priority: must
firmness: firm
semantic_text: The entity types that carry firmness shall be req and adr. The supersede explanation heading shall be Why this changed. The minimum supersede explanation length shall be 12 words.
semantic_clauses:
  - The entity types that carry firmness shall be req and adr.
  - The supersede explanation heading shall be Why this changed.
  - The minimum supersede explanation length shall be 12 words.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:33:03.598Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8a61d75aa9bc433e40b7140928492214c42119ec365dc8c319cb8810edd35ffd
semantic_inventory:
  - claim_key: CLAIM-1ACE983F105BF0F1
    claim_text: The entity types that carry firmness shall be req and adr
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
  - claim_key: CLAIM-B6471B91793A326B
    claim_text: The supersede explanation heading shall be Why this changed
    role: normative
    status: modeled
    span:
      start: 59
      end: 118
  - claim_key: CLAIM-18032217B0DD0A8E
    claim_text: The minimum supersede explanation length shall be 12 words
    role: normative
    status: modeled
    span:
      start: 120
      end: 178
logic_claims:
  - CLAIM-1ACE983F105BF0F1
  - CLAIM-B6471B91793A326B
  - CLAIM-18032217B0DD0A8E
id: REQ-kb-decision-firmness-settings
type: req
---
The entity types that carry firmness shall be req and adr. The supersede explanation heading shall be Why this changed. The minimum supersede explanation length shall be 12 words.

## Context

packages/cli/src/decision-firmness.ts fixes the entity types REQ-kb-decision-firmness applies firmness to, the heading a superseding decision explains itself under and how long that explanation must be. They are stated here so each is proved against the constant; the violations Kibi reports stay in REQ-kb-decision-firmness.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"