---
title: Impact policy opt-in and parsing unit contract
status: passing
source: packages/cli/tests/traceability/impact-policy.test.ts
tags:
  - cli
  - impact-policy
  - stage-e
  - unit
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-impact-policy-opt-in
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-impact-policy-opt-in-unit
type: test
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d47594a7f4cb96487c340a16
    test_id: TEST-cli-impact-policy-opt-in-unit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: c8abb0bc961870fd62cec0869269502a9b24f445fb6c82661e5276e2df46af19
    binding_hash: 6370b449515a8350e85c587588151905f8a3dc1fe24ff22ba829abb5df3a9bab
    fingerprint: 6ae26da2e49926d8343f9cedfde9437d475a7a8f3bc11838129beb2fdb54fbd9
    fingerprint_components:
      contract: c8abb0bc961870fd62cec0869269502a9b24f445fb6c82661e5276e2df46af19
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-unit-test-cli-impact-policy-opt-in
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the impact policy reader: no base policy means impact review is not enabled, a valid base policy enables it, and an invalid policy blob is refused.
