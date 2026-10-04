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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0ebdff18c25b95963e615e52
    test_id: TEST-opencode-tool-telemetry-acceptance
    scope: end_to_end
    outcome: passed
    code_snapshot: f0fd27d161e0f366d0e4027f08bc1530db0ab8379a4a8d6801b80cf635d125ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T06:03:47.950Z'
    finished_at: '2026-10-04T06:03:51.576Z'
    artifact_digest: 4b772ab6cbd382f73a48ec4d8060daff2d5c38ce7b396d51fc8ef92fdf28f4f4
    contract_hash: 59fce5c9796763dadc19e9e795753fc151cff55a3bf24e1ed1f32cf1068ef9b6
    binding_hash: 1944af8f7239bf757a2784094e61baf7efc9c88990ae581390c12232abc5f1ae
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
---
# OpenCode tool hook rows feed the lookup-before-first-edit acceptance metric end to end

Loads the OpenCode plugin for a synced Kibi workspace and replays tool calls through its `tool.execute.after` hook (`packages/opencode/tests/tool-telemetry-acceptance.test.ts`).

- With `KIBI_DIAGNOSTIC_MODE` set, a `kibi_kb_search` call and an edit of requirement-linked code in one session, and an edit before a `kibi_kb_query` in another, append `kb_usage` and `edited` rows to `.kb/usage.log` with `interface: hook`, `host: opencode`, the session ids and the edited file's requirement ids.
- The built `kibi usage-metrics --format json` counts only the real CLI operation row as an operation and reports `lookup_before_first_edit` as 1/2 sessions, naming the unguided edit.
- Without `KIBI_DIAGNOSTIC_MODE` the same calls write no row.
