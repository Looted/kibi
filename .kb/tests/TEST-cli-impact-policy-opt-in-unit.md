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
    receipt_id: PR-0dfa8c855c812cdf31971da7
    test_id: TEST-cli-impact-policy-opt-in-unit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
