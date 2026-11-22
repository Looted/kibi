---
title: The kibi CLI sends a command's summary event to the telemetry host and stops when telemetry is turned off
status: passing
priority: should
tags:
  - telemetry
  - privacy
  - cli
  - agent-core
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-29T10:10:00.786Z'
id: TEST-kibi-anonymous-usage-telemetry-cli
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-anonymous-usage-telemetry-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-anonymous-usage-telemetry-cli
    target: default
    native_id: packages/cli/tests/usage-telemetry-e2e.test.ts::kibi CLI anonymous usage telemetry (end to end)::a CLI command sends its summary event to the telemetry host and leaves the workspace out
    source_file: packages/cli/tests/usage-telemetry-e2e.test.ts
    line: 84
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6eba8eddf3f30ebf6c2a6b41
    test_id: TEST-kibi-anonymous-usage-telemetry-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 731971d408b14c30e31e54f2ca750d6d5a203572b27734e8484959da9f3d2f77
    binding_hash: ff62371a511fccc8ccf7094b5d248376f31ca9fd792e8490547fa0ede0f692e2
    fingerprint: 06c4edfdbe20e03b161f4edcc680dde029e52234844094c01d519f6ec5890aea
    fingerprint_components:
      contract: 731971d408b14c30e31e54f2ca750d6d5a203572b27734e8484959da9f3d2f77
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: b03bcb7f6893da3fbbba927fa2ec3cd6a8c8c955163afffc356b5fb895fc84b5
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-anonymous-usage-telemetry-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` binary against a local stand-in for the PostHog batch endpoint (`packages/cli/tests/usage-telemetry-e2e.test.ts`).

It checks that `kibi telemetry status` reports telemetry on, that a due queue is sent in one batch holding the command's name, interface and exit code but not the workspace path, that the first-run notice appears once and names `kibi telemetry disable`, and that `kibi telemetry disable` and `KIBI_TELEMETRY=0` stop both recording and sending.