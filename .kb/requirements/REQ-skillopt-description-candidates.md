---
title: SkillOpt candidates may replace the skill description
status: open
priority: must
tags:
  - skillopt
  - evaluation
semantic_text: SkillOpt must let a candidate replace the skill frontmatter description together with the skill body. Every other frontmatter field must stay frozen. A replacement description must be one non-empty line of at most 1024 characters without angle brackets and must follow the candidate content policy. The candidate manifest must record the replacement description and its hash. Every scored cell, cohort binding and package must use the exact recorded description. A replacement description without a replacement body must be refused.
logic_claims:
  - CLAIM-DA8D366AE8B1C620
  - CLAIM-9B1126B6E74738FC
  - CLAIM-12A1BC1F98E83E97
  - CLAIM-C57B926D34F8FCE6
  - CLAIM-B9A653CF45D02C5D
  - CLAIM-C2523BEA8503B159
semantic_inventory:
  - claim_key: CLAIM-DA8D366AE8B1C620
    claim_text: SkillOpt must let a candidate replace the skill frontmatter description together with the skill body
    role: normative
    span:
      start: 0
      end: 100
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
  - claim_key: CLAIM-9B1126B6E74738FC
    claim_text: Every other frontmatter field must stay frozen
    role: normative
    span:
      start: 102
      end: 148
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
  - claim_key: CLAIM-12A1BC1F98E83E97
    claim_text: A replacement description must be one non-empty line of at most 1024 characters without angle brackets and must follow the candidate content policy
    role: normative
    span:
      start: 150
      end: 297
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
  - claim_key: CLAIM-C57B926D34F8FCE6
    claim_text: The candidate manifest must record the replacement description and its hash
    role: normative
    span:
      start: 299
      end: 374
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
  - claim_key: CLAIM-B9A653CF45D02C5D
    claim_text: Every scored cell, cohort binding and package must use the exact recorded description
    role: normative
    span:
      start: 376
      end: 461
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
  - claim_key: CLAIM-C2523BEA8503B159
    claim_text: A replacement description without a replacement body must be refused
    role: normative
    span:
      start: 463
      end: 531
    payload_hash: 63201a06cb9ee95585505f8b21ac3d8e5b8d19c41d74a1e4c666b70ce3401527
    status: modeled
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7925c6c8a1f8ffd1154bdcad5dec2591f9b9648264a50f27ed50116187b09320
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: let SkillOpt optimize the skill description, not just the body'
  approved_by: Piotr
  recorded_at: '2026-10-06T00:22:44.016Z'
rationale: Agents choose whether to load a skill from its frontmatter description. In the v6 evaluate kibi-bootstrap loaded in only 2 of 10 cells, so body-only candidates could not change onboarding, repair or apply behavior. Piotr chose to let SkillOpt optimize the description too.
id: REQ-skillopt-description-candidates
type: req
---
SkillOpt must let a candidate replace the skill frontmatter description together with the skill body. Every other frontmatter field must stay frozen. A replacement description must be one non-empty line of at most 1024 characters without angle brackets and must follow the candidate content policy. The candidate manifest must record the replacement description and its hash. Every scored cell, cohort binding and package must use the exact recorded description. A replacement description without a replacement body must be refused.
