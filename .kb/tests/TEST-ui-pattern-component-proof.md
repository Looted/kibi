---
title: UI pattern component proof tests
status: passing
tags:
  - proof
  - ui
  - proof-ladder
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:33.983Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ui-pattern-component-proof
      target: default
  success_policy: all_required_first_attempt
id: TEST-ui-pattern-component-proof
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0d5e8d995dea2b75eb0db08a
    test_id: TEST-ui-pattern-component-proof
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6bdb6e3326bc3d3dc11472be2e1d0cbf600abaedb65fa3ca5571b962f5be5150
    binding_hash: f5e42b09e0e2a1e3ebccb85a72df8fc53448ae8345ebf415acea409031a62022
    fingerprint: 534d6634462189555cbaccd0bab8821c1f5b54a7d88b2dcb7b0f0d9d8d7e2336
    fingerprint_components:
      contract: 6bdb6e3326bc3d3dc11472be2e1d0cbf600abaedb65fa3ca5571b962f5be5150
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
      - symbol_id: SYM-test-ui-pattern-component-proof
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the Prolog ui_pattern_component_proof unit, which builds a requirement grounded in ui_pattern and same_pattern facts with a unit-scope test and a fresh passing receipt, checks that the proof ladder accepts it and reports the widened accepted scopes, then links a ui_container fact and checks that the same test no longer proves the requirement.
