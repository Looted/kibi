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
    receipt_id: PR-2f56ae967d365a42c3b5dc76
    test_id: TEST-proof-proof-result-outcomes
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 68167cc635fa0326e7a1178acc4131dbc50aadb581b54df96c8e2f35d0f32b8f
    binding_hash: 88b482435b342745796a604e0f8e6a17198da08ced0514d7825be0f38ef870ba
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