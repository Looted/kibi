---
title: Telemetry endpoint and automation detection keys
status: open
priority: must
firmness: firm
semantic_text: The default telemetry endpoint shall be https://eu.i.posthog.com. A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds. A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT.
semantic_clauses:
  - The default telemetry endpoint shall be https://eu.i.posthog.com.
  - A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds.
  - A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:26:49.824Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9dbbba4e94e0e3eb31c741075144300d51d275fdc54e03b409aef40d489a4f42
semantic_inventory:
  - claim_key: CLAIM-55E465F9B137434C
    claim_text: The default telemetry endpoint shall be https://eu.i.posthog.com
    role: normative
    status: modeled
    span:
      start: 0
      end: 64
  - claim_key: CLAIM-EBC3527C431863A3
    claim_text: A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds
    role: normative
    status: modeled
    span:
      start: 66
      end: 162
  - claim_key: CLAIM-25B6330588FD2199
    claim_text: A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT
    role: normative
    status: modeled
    span:
      start: 164
      end: 296
logic_claims:
  - CLAIM-55E465F9B137434C
  - CLAIM-EBC3527C431863A3
  - CLAIM-25B6330588FD2199
id: REQ-kibi-telemetry-automation-keys
type: req
---
The default telemetry endpoint shall be https://eu.i.posthog.com. A CI environment variable that silences telemetry shall be one of the 18 names the CI list holds. A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT.

## Context

packages/agent-core/src/usage-telemetry.ts sends the anonymous statistics REQ-kibi-anonymous-usage-telemetry describes and keeps CI and test-runner processes silent. The default endpoint and both variable lists are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"