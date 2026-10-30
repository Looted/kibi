---
title: Fact kinds a fact query filters on
status: open
priority: must
firmness: firm
semantic_text: A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema.
semantic_clauses:
  - A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:33:24.450Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 25c9716151f15ad7494a73f8ae4e343ca9304b1a39a84712ec6f145b34d7ca61
semantic_inventory:
  - claim_key: CLAIM-3253623B1A7BA74D
    claim_text: A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
logic_claims:
  - CLAIM-3253623B1A7BA74D
id: REQ-kibi-query-fact-kinds
type: req
---
A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema.

## Context

packages/cli/src/public/operations/discovery-executors.ts lists the fact kinds REQ-kibi-query-fact-filters lets a query filter on. The set is stated here so it is proved against the executor.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"