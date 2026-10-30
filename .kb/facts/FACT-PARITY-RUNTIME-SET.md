---
id: FACT-PARITY-RUNTIME-SET
title: No audited runtime skips the canonical fixture set
status: active
fact_kind: property_value
subject_key: kibi.distribution.parity
property_key: audited_runtimes_without_fixture_run
operator: eq
value_type: int
value_int: 0
canonical_key: kibi.distribution.parity:audited_runtimes_without_fixture_run:eq:0
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - parity
  - distribution
claim_key: CLAIM-46D4F2FCBD3E4628
claim_text: The runner must execute the same canonical fixture set against the source checkout, fresh CLI and MCP packages, and every project-resolved runtime
claim_span_start: 0
claim_span_end: 146
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the audited runtime set.
