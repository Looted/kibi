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
    receipt_id: PR-ce4d67ee4d00258fddf58895
    test_id: TEST-kibi-anonymous-usage-telemetry-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 299b4edb0ca22fd66ddaa89049f1e280342a76237afd27e54425655fa8f56d16
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T18:21:24.929Z'
    finished_at: '2026-11-11T18:21:27.558Z'
    artifact_digest: b14c028dba13a1751a45e6f81c448218f042bda59dedcedaa36b540de3138c6f
    contract_hash: 731971d408b14c30e31e54f2ca750d6d5a203572b27734e8484959da9f3d2f77
    binding_hash: 301d4406c1a53d9e6a9bd9ebec4b72d6f032c058afdcb1d4cba9c19f625849b5
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