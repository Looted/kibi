---
title: Consumer CLI reports the sessions that edited requirement-linked code before looking it up
status: passing
priority: must
tags:
  - telemetry
  - usage-metrics
  - acceptance
  - hooks
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-telemetry-lookup-before-first-edit-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-telemetry-lookup-before-first-edit-cli
    target: default
    native_id: packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts::telemetry lookup before first edit through the kibi CLI::reports the session that edited a requirement-linked file before kb_search or kb_query and credits the session that looked it up first
    source_file: packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts
    line: 187
origin:
  kind: agent
  recorded_at: '2026-10-04T05:30:34.573Z'
id: TEST-kibi-telemetry-lookup-before-first-edit-cli
type: test
---
# Consumer CLI reports the sessions that edited requirement-linked code before looking it up

Drives `kibi usage-metrics`, `kibi usage-remediation` and `kibi check` through the built `kibi` binary over a usage log of real CLI operation rows and host hook rows (`packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts`).

- `lookup_before_first_edit` reports the session that edited requirement-linked code before any `kb_search` or `kb_query` and credits the session that looked it up first; hook rows never count toward the operation window.
- `--require-acceptance` fails the run and still prints the report, remediation points at the log line of the unguided edit, and `kibi check` carries the same finding as a non-blocking diagnostic.
- The metric passes when every session looked up first, and is not applicable when no requirement-linked file was edited.
