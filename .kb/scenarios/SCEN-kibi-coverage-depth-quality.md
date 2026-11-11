---
title: 'A requirement''s coverage depth comes from its scenario, test and end-to-end evidence'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-coverage-depth-quality
type: scenario
---
Given requirements whose evidence is no test, a scenario without a test, open tests, unit tests only, or a passing behavior-level test, when kibi check runs, then each is classified as no_test_evidence, scenario_only_no_test, open_or_nonpassing_tests_only, unit_only or behavior_level, and a current passing end-to-end receipt suppresses the review.

This is the success side of coverage depth: the classification follows the evidence actually linked. packages/cli/tests/public/impact/coverage-depth-quality.test.ts and the kb_coverage_depth Prolog tests exercise each depth, and documentation/tests/e2e/packed/cli-workflows.test.ts checks it through the packed CLI.
