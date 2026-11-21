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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-35028a6e444bd6c9cc734853
    test_id: TEST-opencode-tool-telemetry-acceptance
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 59fce5c9796763dadc19e9e795753fc151cff55a3bf24e1ed1f32cf1068ef9b6
    binding_hash: 63f0efcdaf82842e6e654d5197316b08e576d2b9442f12916fc4e2fb7b5734a0
    fingerprint: 38e83308a7db7aa9378c2ef8e83255b012a11b240b3f38ab5cd2421ece902503
    fingerprint_components:
      contract: 59fce5c9796763dadc19e9e795753fc151cff55a3bf24e1ed1f32cf1068ef9b6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 3b7196d5bd307308cdfc0451b302925c44d2e026a5309628d7358c741867de15
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-opencode-tool-telemetry-acceptance
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# OpenCode tool hook rows feed the lookup-before-first-edit acceptance metric end to end

Loads the OpenCode plugin for a synced Kibi workspace and replays tool calls through its `tool.execute.after` hook (`packages/opencode/tests/tool-telemetry-acceptance.test.ts`).

- With `KIBI_DIAGNOSTIC_MODE` set, a `kibi_kb_search` call and an edit of requirement-linked code in one session, and an edit before a `kibi_kb_query` in another, append `kb_usage` and `edited` rows to `.kb/usage.log` with `interface: hook`, `host: opencode`, the session ids and the edited file's requirement ids.
- The built `kibi usage-metrics --format json` counts only the real CLI operation row as an operation and reports `lookup_before_first_edit` as 1/2 sessions, naming the unguided edit.
- Without `KIBI_DIAGNOSTIC_MODE` the same calls write no row.
