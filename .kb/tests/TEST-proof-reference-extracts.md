---
title: A reference extract shall be env, imports, calls, string_args, thrown or property, by an exhaustive proof
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
    - symbol_id: SYM-proof-reference-extracts
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-reference-extracts
  proves:
    - CLAIM-BDF0CF219768BC5D
origin:
  kind: agent
  recorded_at: '2026-10-28T20:38:17.379Z'
id: TEST-proof-reference-extracts
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7ebb0f6515690cdd0f57da6d
    test_id: TEST-proof-reference-extracts
    scope: unit
    outcome: passed
    code_snapshot: bc1213c2370b5f78c97ee31d99b3edbe5c80d361104c881245f13169e433a917
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:40:40.893Z'
    finished_at: '2026-10-28T20:40:41.027Z'
    artifact_digest: 6fbb01018660f6004636b6f99d0549526877b7d19bc0105cb7091bd40887b028
    contract_hash: d278fdbefdc0f77cccf7880d588b53debc3810dee26f3f2b7c5e7a91c4aca2ff
    binding_hash: 9d6d58997f67701c1a211f4f50612f93af4dc21479dc5f1f69b843140147f160
    fingerprint: 2c9f57293833616e4c9aeedb77dbd69ee8ccb7dabf13669b494bc4e32327c48d
    fingerprint_components:
      contract: d278fdbefdc0f77cccf7880d588b53debc3810dee26f3f2b7c5e7a91c4aca2ff
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
      - symbol_id: SYM-proof-reference-extracts
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
      test_id: TEST-proof-reference-extracts
      domain:
        symbol_id: SYM-const-reference-extracts
        members:
          - env
          - imports
          - calls
          - string_args
          - thrown
          - property
      results:
        - member: env
          outcome: passed
        - member: imports
          outcome: passed
        - member: calls
          outcome: passed
        - member: string_args
          outcome: passed
        - member: thrown
          outcome: passed
        - member: property
          outcome: passed
    certificate_digest: 90a52ffc146b68be6e39e1735075c3592b1d3b6f168e1f658944779d83f5b52a
    claim_bindings:
      - claim_key: CLAIM-BDF0CF219768BC5D
        requirement_id: REQ-kibi-code-certificate-settings
        fact_id: FACT-reference-extracts
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - calls
            - env
            - imports
            - property
            - string_args
            - thrown
---
Proves that a reference extract shall be env, imports, calls, string_args, thrown or property, against the code Kibi reads at ingest.