---
title: Scripts unit coverage shard
status: active
fact_kind: subject
subject_key: kibi.testing.scripts_coverage_shard
canonical_key: kibi.testing.scripts_coverage_shard
text_ref: scripts/run-unit-coverage.ts
id: FACT-scripts-coverage-shard-subject
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The unit-coverage shard that runs the tests of Kibi's repository scripts, selecting each matching test file once and running it in its own process. It is part of the coverage tooling, not the scripts under test.
