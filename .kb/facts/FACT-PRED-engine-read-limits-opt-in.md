---
title: Engine read limits are opt-in through environment variables
status: active
tags:
  - lane:ontology
  - engine
  - limits
claim_key: CLAIM-ACFF98FA7F129299
claim_text: Engine read limits must apply only when KIBI_ENGINE_READ_TIME_LIMIT_MS or KIBI_ENGINE_READ_INFERENCE_LIMIT is set
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - limit_environment_variables_unset
  - reads_unbounded
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,limit_environment_variables_unset,reads_unbounded)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:49.738Z'
id: FACT-PRED-engine-read-limits-opt-in
type: fact
---
