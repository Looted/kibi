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
    receipt_id: PR-c1629c3054e63e03334181d2
    test_id: TEST-proof-run-failure-phases
    scope: unit
    outcome: passed
    code_snapshot: d699a078fe8d2323d221f435a979d519f5acca43cfee14f7307e23c39a35f0fa
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T21:01:15.332Z'
    finished_at: '2026-11-16T21:01:34.441Z'
    artifact_digest: 3ef1b1564e3821c2d1f507334af153c4831866821439fdb98ef86c918ef3be6e
    contract_hash: c1528562d4605765a54dd48090c493310aee53b48c0018bc147e976e5cc42b19
    binding_hash: c31c8c25f31dc25b155191de8c09a8df97d92f618d1dd610c249401d61bf1f46
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