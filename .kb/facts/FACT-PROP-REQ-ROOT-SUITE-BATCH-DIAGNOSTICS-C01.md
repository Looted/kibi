---
title: kibi.testing.harness clause 1
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.testing.harness
property_key: batches_bounded_subprocesses
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_root_suite_batch_diagnostics.batches_bounded_subprocesses.eq.true
claim_key: CLAIM-F06D80E8EEC340F7
claim_text: The curated unit suite (test/root.test.ts) must run package-scoped batches as spawned bun subprocesses bounded by BATCH_TIMEOUT_MINUTES (25 minutes)
id: FACT-PROP-REQ-ROOT-SUITE-BATCH-DIAGNOSTICS-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
