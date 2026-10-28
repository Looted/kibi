---
title: Legacy and digest migration plan versions
status: open
priority: must
firmness: firm
semantic_text: The legacy migration plan version shall be kibi.legacy-migration-plan.v1. The migration plan digest version shall be kibi.migration-plan-digest.v2. A refused migration plan shall return the code MIGRATION_PLAN_REFUSED.
semantic_clauses:
  - The legacy migration plan version shall be kibi.legacy-migration-plan.v1.
  - The migration plan digest version shall be kibi.migration-plan-digest.v2.
  - A refused migration plan shall return the code MIGRATION_PLAN_REFUSED.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:55:11.652Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bb3f319527ffdb5d73e082f0454e9e32047aea4a52e4f144383ca1a2f7e0672b
semantic_inventory:
  - claim_key: CLAIM-EE1D765F437D4038
    claim_text: The legacy migration plan version shall be kibi.legacy-migration-plan.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 72
  - claim_key: CLAIM-4E3E2EB3D1E7A917
    claim_text: The migration plan digest version shall be kibi.migration-plan-digest.v2
    role: normative
    status: modeled
    span:
      start: 74
      end: 146
  - claim_key: CLAIM-250EDD12651935F1
    claim_text: A refused migration plan shall return the code MIGRATION_PLAN_REFUSED
    role: normative
    status: modeled
    span:
      start: 148
      end: 217
logic_claims:
  - CLAIM-EE1D765F437D4038
  - CLAIM-4E3E2EB3D1E7A917
  - CLAIM-250EDD12651935F1
id: REQ-agent-migration-plan-versions
type: req
---
The legacy migration plan version shall be kibi.legacy-migration-plan.v1. The migration plan digest version shall be kibi.migration-plan-digest.v2. A refused migration plan shall return the code MIGRATION_PLAN_REFUSED.

## Context

REQ-agent-guided-migration-orchestration hands an agent a versioned plan, a legacy KB gets its own versioned plan, the plan is bound by a versioned digest and a plan that cannot run is refused with a fixed code. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"