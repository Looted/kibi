---
id: FACT-PARITY-RUNTIME-SET
title: Parity fixtures run through every audited runtime class
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - parity
  - distribution
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.distribution.parity
  - execute_canonical_fixture_set
  - source_packed_and_project_resolved_runtimes
canonical_key: logical_requirement_rule(kibi.distribution.parity,execute_canonical_fixture_set,source_packed_and_project_resolved_runtimes)
polarity: assert
claim_key: CLAIM-46D4F2FCBD3E4628
claim_text: The runner must execute the same canonical fixture set against the source checkout, fresh CLI and MCP packages, and every project-resolved runtime
claim_span_start: 0
claim_span_end: 146
type: fact
---

Ground representation of the audited runtime set.
