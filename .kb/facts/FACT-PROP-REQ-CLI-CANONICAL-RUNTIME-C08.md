---
title: createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/mi
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.kb.canonical_layout
property_key: ignore_policy_denies_derived_trees
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cli_canonical_runtime.ignore_policy_denies_derived_trees.eq.true
claim_key: CLAIM-B842BEFAEC1A9D00
claim_text: createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes
id: FACT-PROP-REQ-CLI-CANONICAL-RUNTIME-C08
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
