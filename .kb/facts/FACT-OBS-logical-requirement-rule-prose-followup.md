---
title: logical_requirement_rule arguments converged; obligation and outcome stay prose by design
status: active
fact_kind: observation
tags:
  - vocabulary
  - follow-up
  - ontology-quality
  - review:ontology-gap
id: FACT-OBS-logical-requirement-rule-prose-followup
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Observation (completed): the follow-up to reduce prose-like arguments in `logical_requirement_rule/3` is done for the `subject` slot.

- Namespaces are unified: 56 subject moves onto `kibi.*` component constants, plus 11 predicate schemas declared and 6 further moves.
- `subject` is a closed argument vocabulary with 23 constants, enforced by the `predicate-schema-conformance` rule.
- 128 alias rewrites were applied by the `predicate_schema_alignment` migration. The subject aliases were then pruned from 107 to 31, keeping only true synonyms of each component.
- The `ontology-quality` singleton share went from 88% to 63%, and the diagnostic now names the prose-like arguments per slot.

Remaining by design: `obligation` and `outcome` stay prose. Closing them would collapse distinct obligations onto shared constants and create false `domain-redundancy` findings, so the one `ontology-quality` info finding on this predicate is expected.
