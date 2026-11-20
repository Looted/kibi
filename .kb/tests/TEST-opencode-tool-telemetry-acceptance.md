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
    receipt_id: PR-cf8c6c2824c5a17f8b1728cb
    test_id: TEST-opencode-tool-telemetry-acceptance
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
