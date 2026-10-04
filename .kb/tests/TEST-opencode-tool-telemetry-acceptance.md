---
title: OpenCode tool hook rows feed the lookup-before-first-edit acceptance metric end to end
status: passing
priority: must
tags:
  - telemetry
  - opencode
  - hooks
  - acceptance
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-opencode-tool-telemetry-acceptance
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-opencode-tool-telemetry-acceptance
    target: default
    native_id: packages/opencode/tests/tool-telemetry-acceptance.test.ts::OpenCode tool telemetry through kibi usage-metrics (end to end)::the plugin's tool hook logs lookups and requirement-linked edits, and the acceptance metric reads only those rows for lookup before first edit
    source_file: packages/opencode/tests/tool-telemetry-acceptance.test.ts
    line: 222
origin:
  kind: agent
  recorded_at: '2026-10-04T05:46:40.684Z'
id: TEST-opencode-tool-telemetry-acceptance
type: test
---
# OpenCode tool hook rows feed the lookup-before-first-edit acceptance metric end to end

Loads the OpenCode plugin for a synced Kibi workspace and replays tool calls through its `tool.execute.after` hook (`packages/opencode/tests/tool-telemetry-acceptance.test.ts`).

- With `KIBI_DIAGNOSTIC_MODE` set, a `kibi_kb_search` call and an edit of requirement-linked code in one session, and an edit before a `kibi_kb_query` in another, append `kb_usage` and `edited` rows to `.kb/usage.log` with `interface: hook`, `host: opencode`, the session ids and the edited file's requirement ids.
- The built `kibi usage-metrics --format json` counts only the real CLI operation row as an operation and reports `lookup_before_first_edit` as 1/2 sessions, naming the unguided edit.
- Without `KIBI_DIAGNOSTIC_MODE` the same calls write no row.
