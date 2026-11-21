---
title: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-result-outcomes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-result-outcomes
  proves:
    - CLAIM-D8E61F01CA133EFE
origin:
  kind: agent
  recorded_at: '2026-10-28T17:47:37.331Z'
id: TEST-proof-proof-result-outcomes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a86ca4d902d6108c25b230e4
    test_id: TEST-proof-proof-result-outcomes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 68167cc635fa0326e7a1178acc4131dbc50aadb581b54df96c8e2f35d0f32b8f
    binding_hash: 45120aab9d4d04fc071c9e66f8b0d2b0483806b5400bbec9c03ac04858b2ea68
    fingerprint: ffb3da574fcda52f2e9effdb05e3c2258ea35695a845419153d33e447882e6a3
    fingerprint_components:
      contract: 68167cc635fa0326e7a1178acc4131dbc50aadb581b54df96c8e2f35d0f32b8f
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
      - symbol_id: SYM-proof-proof-result-outcomes
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
      test_id: TEST-proof-proof-result-outcomes
      domain:
        symbol_id: SYM-proof-result-outcomes
        members:
          - passed
          - failed
          - timed_out
          - skipped
          - interrupted
          - errored
      results:
        - member: passed
          outcome: passed
        - member: failed
          outcome: passed
        - member: timed_out
          outcome: passed
        - member: skipped
          outcome: passed
        - member: interrupted
          outcome: passed
        - member: errored
          outcome: passed
    certificate_digest: 97caa6f9fa2c850901e82b8adfe81489c29fd5ce2402efe60d84b6e4508d3237
    claim_bindings:
      - claim_key: CLAIM-D8E61F01CA133EFE
        requirement_id: REQ-kibi-proof-result-vocabulary
        fact_id: FACT-proof-result-outcomes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - errored
            - failed
            - interrupted
            - passed
            - skipped
            - timed_out
---
Proves that a proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored, against the code Kibi reads at ingest.