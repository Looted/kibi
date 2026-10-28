---
title: Kibi's relationship type vocabulary
status: open
priority: must
firmness: firm
semantic_text: Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to.
semantic_clauses:
  - Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:21:38.407Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 00ad81d6217538d61d0464260340a6aa45dba294d5cd53697ae88fd63b84be2c
semantic_inventory:
  - claim_key: CLAIM-DB5C788DA756E5F2
    claim_text: Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to
    role: normative
    status: modeled
    span:
      start: 0
      end: 287
logic_claims:
  - CLAIM-DB5C788DA756E5F2
id: REQ-kibi-relationship-type-vocabulary
type: req
---
Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to.

## Context

RELATIONSHIP_TYPES in packages/cli/src/operations/mutation/relationships.ts is the list of relationship types kb_upsert accepts. REQ-005 names the first-class relationships, REQ-016 the supersedes chain between ADRs and REQ-kibi-restates-relationship the restates link; this requirement states the vocabulary they rely on so it is proved against the list itself, while what each relationship means stays in those requirements.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"