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
    receipt_id: PR-c2c6be4583aa3f769682cff1
    test_id: TEST-kibi-anonymous-usage-telemetry-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: ec09c5c8360bc62374cc96794ed302e6b74770738cb7481a3617e21f01ce4a15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:28:58.853Z'
    finished_at: '2026-10-29T16:29:00.817Z'
    artifact_digest: 519b275f596e1420f1c07349d19ecd53f2b7f5a13cc7da2606d9db7e4f011b3d
    contract_hash: 731971d408b14c30e31e54f2ca750d6d5a203572b27734e8484959da9f3d2f77
    binding_hash: 392ff055bf2513364e2480e5381217ca3fd7114e26ec0a3daae2870de765e948
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