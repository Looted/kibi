---
title: Skill file name and resource limit
status: open
priority: must
firmness: default
semantic_text: A skill file shall be named SKILL.md. A skill resource shall be at most 131072 bytes.
semantic_clauses:
  - A skill file shall be named SKILL.md.
  - A skill resource shall be at most 131072 bytes.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:12:55.563Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 41e7fe30ca0122a1448027dbc7ec6a64b52411700e9367d78b2a07c9076d8bae
semantic_inventory:
  - claim_key: CLAIM-C0A950028A3B82F5
    claim_text: A skill file shall be named SKILL.md
    role: normative
    status: modeled
    span:
      start: 0
      end: 36
  - claim_key: CLAIM-8A9C68E905170BC4
    claim_text: A skill resource shall be at most 131072 bytes
    role: normative
    status: modeled
    span:
      start: 38
      end: 84
logic_claims:
  - CLAIM-C0A950028A3B82F5
  - CLAIM-8A9C68E905170BC4
id: REQ-skill-file-limits
type: req
required_evidence: tested
---
A skill file shall be named SKILL.md. A skill resource shall be at most 131072 bytes.

## Context

REQ-reusable-skill-subsystem loads a skill from a folder that holds a fixed file name and rejects a resource above a size bound. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"