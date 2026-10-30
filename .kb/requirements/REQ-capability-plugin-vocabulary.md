---
title: Capability plugin modes, polarities and lanes
status: open
priority: must
firmness: firm
semantic_text: A capability plugin mode shall be replace, augment or shadow. An ontology pack polarity shall be assert or deny. A semantic lane shall be strict_property, predicate, rule, observation_review or none. A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default. An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent.
semantic_clauses:
  - A capability plugin mode shall be replace, augment or shadow.
  - An ontology pack polarity shall be assert or deny.
  - A semantic lane shall be strict_property, predicate, rule, observation_review or none.
  - A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default.
  - An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:29:00.746Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a1837f25c0a113df2840ab38f8425c9aa2d93106230a3ee6bcd22c8b5af87941
semantic_inventory:
  - claim_key: CLAIM-9E9ED39996A9AE28
    claim_text: A capability plugin mode shall be replace, augment or shadow
    role: normative
    status: modeled
    span:
      start: 0
      end: 60
  - claim_key: CLAIM-29C261A1A9DA5FDB
    claim_text: An ontology pack polarity shall be assert or deny
    role: normative
    status: modeled
    span:
      start: 62
      end: 111
  - claim_key: CLAIM-B15674FBA5592F7B
    claim_text: A semantic lane shall be strict_property, predicate, rule, observation_review or none
    role: normative
    status: modeled
    span:
      start: 113
      end: 198
  - claim_key: CLAIM-674F7648CC43012D
    claim_text: A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default
    role: normative
    status: modeled
    span:
      start: 200
      end: 332
  - claim_key: CLAIM-C22A6481F799BDA3
    claim_text: An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent
    role: normative
    status: modeled
    span:
      start: 334
      end: 426
logic_claims:
  - CLAIM-9E9ED39996A9AE28
  - CLAIM-29C261A1A9DA5FDB
  - CLAIM-B15674FBA5592F7B
  - CLAIM-674F7648CC43012D
  - CLAIM-C22A6481F799BDA3
id: REQ-capability-plugin-vocabulary
type: req
---
A capability plugin mode shall be replace, augment or shadow. An ontology pack polarity shall be assert or deny. A semantic lane shall be strict_property, predicate, rule, observation_review or none. A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default. An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent.

## Context

packages/plugin-sdk/src defines the plugin vocabulary REQ-capability-plugin-protocol-v1 fixes, and packages/cli/src/plugins/external-allowlist.ts limits where REQ-capability-plugin-activation-disclosure-v1 lets an external classifier load. Each set is stated here so it is proved against the SDK and the allowlist.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"