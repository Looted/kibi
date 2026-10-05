---
id: FACT-PARITY-ACTION
title: Every project divergence names a repair action
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - parity
  - repair
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.distribution.parity
  - name_repair_action
  - upgrade_or_compatibility
canonical_key: logical_requirement_rule(kibi.distribution.parity,name_repair_action,upgrade_or_compatibility)
polarity: assert
claim_key: CLAIM-7D05118C28DBC246
claim_text: Every project-resolved divergence must name an upgrade or compatibility action
claim_span_start: 856
claim_span_end: 934
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of repairable project divergence.
