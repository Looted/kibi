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
    receipt_id: PR-999831fa342e500b7770af47
    test_id: TEST-kibi-anonymous-usage-telemetry-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 63d8b76c0f1626d79d655ff32a7a3d1db1973895a671504755dce28263e61690
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:10:47.364Z'
    finished_at: '2026-10-29T10:10:48.852Z'
    artifact_digest: ed64cde40affd94f138ecca9fb50100a3362957bc40bbc06488ccada97db1782
    contract_hash: 731971d408b14c30e31e54f2ca750d6d5a203572b27734e8484959da9f3d2f77
    binding_hash: 55c6a2a93f8c37830700eee5bea959445aece36f569572be132b45be0a6e331f
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