---
title: Root suite batch diagnostics for curated unit test batches
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.testing.harness
canonical_key: req.req_root_suite_batch_diagnostics
id: FACT-SUBJ-REQ-ROOT-SUITE-BATCH-DIAGNOSTICS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Kibi's own test harness: curated unit and packed end-to-end batches run in bounded parallel with deterministic summaries, and each spawned Prolog engine gets a private runtime directory, is reused within its isolation boundary and is stopped afterwards. It is test infrastructure, not product behavior.
