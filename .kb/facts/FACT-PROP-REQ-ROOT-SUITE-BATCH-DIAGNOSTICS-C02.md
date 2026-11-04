---
title: kibi.testing.harness clause 2
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.testing.harness
property_key: batch_failure_names_batch
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_root_suite_batch_diagnostics.batch_failure_names_batch.eq.true
claim_key: CLAIM-2289156CE3CCB8DB
claim_text: When a batch times out, exits non-zero or produces an unexpected number of bun summaries, getBatchFailureMessage must report the batch label, timeout status, exit code and summary count
id: FACT-PROP-REQ-ROOT-SUITE-BATCH-DIAGNOSTICS-C02
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
