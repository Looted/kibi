---
title: A proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-proof-run-outcomes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-run-outcomes
  proves:
    - CLAIM-85C47F78B8ECB253
origin:
  kind: agent
  recorded_at: '2026-10-28T10:55:26.166Z'
id: TEST-proof-proof-run-outcomes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-eeb11c50e019b9ce568b9e99
    test_id: TEST-proof-proof-run-outcomes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 5d2089247ae06a51a63f7fa350b234ad414b65f2ba5e8847e116c56698a78f4e
    binding_hash: c58a12a3494ea0d55970e895afbb48c60300a94bac65cc4ae0b45c132caa043c
    fingerprint: 4d1acbfa265a685d882603b8f5743ad410fdd1aaa24b7f906530cc36a003fed4
    fingerprint_components:
      contract: 5d2089247ae06a51a63f7fa350b234ad414b65f2ba5e8847e116c56698a78f4e
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
      - symbol_id: SYM-proof-proof-run-outcomes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-proof-run-outcomes
      domain:
        symbol_id: SYM-proof-run-outcomes
        members:
          - passed
          - failed
          - errored
          - cancelled
          - timed_out
          - interrupted
          - no_results
      results:
        - member: passed
          outcome: passed
        - member: failed
          outcome: passed
        - member: errored
          outcome: passed
        - member: cancelled
          outcome: passed
        - member: timed_out
          outcome: passed
        - member: interrupted
          outcome: passed
        - member: no_results
          outcome: passed
    certificate_digest: f1c1742dcdab6003b31539f084fdee2c712e380bffd03d2156818e00c5747747
    claim_bindings:
      - claim_key: CLAIM-85C47F78B8ECB253
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-run-outcomes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - cancelled
            - errored
            - failed
            - interrupted
            - no_results
            - passed
            - timed_out
---
Proves that a proof run outcome shall be passed, failed, errored, cancelled, timed_out, interrupted or no_results, against the code Kibi reads at ingest.