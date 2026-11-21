---
title: A proof run failure phase shall be setup, collection, execution, teardown or infrastructure, by an exhaustive proof
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
    - symbol_id: SYM-proof-run-failure-phases
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-run-failure-phases
  proves:
    - CLAIM-D6A80A6B786D845A
origin:
  kind: agent
  recorded_at: '2026-10-28T17:47:56.197Z'
id: TEST-proof-run-failure-phases
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-99be88ec1e8f7b33bedcf45e
    test_id: TEST-proof-run-failure-phases
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: c1528562d4605765a54dd48090c493310aee53b48c0018bc147e976e5cc42b19
    binding_hash: ea3d6ff729ff2c4d6d75db655b1972f365483c61dd7a19d3faf92bf1de43f5be
    fingerprint: 43cf62375af4d9a8dc67d61167187d2ba6e707496b5efce09ca6ecaaa64d0cc9
    fingerprint_components:
      contract: c1528562d4605765a54dd48090c493310aee53b48c0018bc147e976e5cc42b19
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
      - symbol_id: SYM-proof-run-failure-phases
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
      test_id: TEST-proof-run-failure-phases
      domain:
        symbol_id: SYM-run-failure-phases
        members:
          - setup
          - collection
          - execution
          - teardown
          - infrastructure
      results:
        - member: setup
          outcome: passed
        - member: collection
          outcome: passed
        - member: execution
          outcome: passed
        - member: teardown
          outcome: passed
        - member: infrastructure
          outcome: passed
    certificate_digest: a4b8eebc91ba07cc2f1ef667b51a098de6336e91b41d8aaee636ee79f535eacb
    claim_bindings:
      - claim_key: CLAIM-D6A80A6B786D845A
        requirement_id: REQ-kibi-proof-result-vocabulary
        fact_id: FACT-run-failure-phases
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - collection
            - execution
            - infrastructure
            - setup
            - teardown
---
Proves that a proof run failure phase shall be setup, collection, execution, teardown or infrastructure, against the code Kibi reads at ingest.