---
title: The curated unit test suite (`test/root.test.ts`) runs package-scoped\nbatches a
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_root_suite_batch_diagnostics
property_key: clause_01_the_curated_unit_test_suite_test_root_test_ts_ru
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_root_suite_batch_diagnostics.clause_01_the_curated_unit_test_suite_test_root_test_ts_ru.eq.true
claim_key: CLAIM-76A149F31027A6F8
claim_text: The curated unit test suite (`test/root.test.ts`) runs package-scoped\nbatches as spawned `bun` subprocesses and must surface actionable\ndiagnostics when a batch times out, exits non-zero, or produces an\nunexpected number of bun summaries.\n\nEach batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min)
id: FACT-PROP-REQ-ROOT-SUITE-BATCH-DIAGNOSTICS-C01
type: fact
---
