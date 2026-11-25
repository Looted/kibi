---
title: The schema 20 upgrade keeps the project's Kibi level and says how to choose remember
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: The schema 20 upgrade must leave the Kibi level as it is, so an existing project stays at test unless it sets remember. The schema 20 upgrade notes must say how to choose remember.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Making them opt-out: "Can we do opt-out (ask the user during init/onboarding, make sure the agent asks if running init/onboarding via prompt)." Approving the Kibi level statements, statement 4 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:21.335Z'
rationale: Kibi levels are opt-out with test as the default, so a project that upgrades keeps the checks it had; the upgrade notes tell the person how to choose remember.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 55c694a244af0087ed66327b18986e90b8ff494f9891e8956c51e4beb27766ed
semantic_inventory:
  - claim_key: CLAIM-C775A286948D3B7A
    claim_text: The schema 20 upgrade must leave the Kibi level as it is, so an existing project stays at test unless it sets remember
    role: exception
    status: modeled
    span:
      start: 0
      end: 118
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-schema-20-level-c01 via requires_property.
  - claim_key: CLAIM-01CBFD861A7B9440
    claim_text: The schema 20 upgrade notes must say how to choose remember
    role: normative
    status: modeled
    span:
      start: 120
      end: 179
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-schema-20-level-c02 via requires_property.
logic_claims:
  - CLAIM-C775A286948D3B7A
  - CLAIM-01CBFD861A7B9440
id: REQ-kibi-schema-20-level
type: req
---
The schema 20 upgrade must leave the Kibi level as it is, so an existing project stays at test unless it sets remember. The schema 20 upgrade notes must say how to choose remember.

## Context

Kibi levels are opt-out with test as the default, so a project that upgrades keeps the checks it had; the upgrade notes tell the person how to choose remember.
