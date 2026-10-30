---
title: A proof producer shall be command, playwright, junit or tap, by an exhaustive proof
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
    - symbol_id: SYM-proof-producer-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-producer-kinds
  proves:
    - CLAIM-5FD532ADAFB84B98
origin:
  kind: agent
  recorded_at: '2026-10-28T17:49:10.272Z'
id: TEST-proof-producer-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a711efdd63382b87c1473d9a
    test_id: TEST-proof-producer-kinds
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:29.602Z'
    finished_at: '2026-10-28T17:52:29.767Z'
    artifact_digest: 825ac76c72af04288ded67539e8d7087c8562ba9aa9cd854f2b82204e7eae2f1
    contract_hash: f97c58d5f1222f3e7764f6677b196c8c39322fe0d3abae438ce2aac0b9e5124d
    binding_hash: 708c787efb7bfaddff4c462ed7f8a97f31240c3800dbc495f94d7f36a7b8aa1e
    fingerprint: 0593db2ee6f61bf194b6b51f0baf1902005c1ab63b7dcd9a34137f7bc95e70d3
    fingerprint_components:
      contract: f97c58d5f1222f3e7764f6677b196c8c39322fe0d3abae438ce2aac0b9e5124d
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
      - symbol_id: SYM-proof-producer-kinds
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
      test_id: TEST-proof-producer-kinds
      domain:
        symbol_id: SYM-producer-kinds
        members:
          - command
          - playwright
          - junit
          - tap
      results:
        - member: command
          outcome: passed
        - member: playwright
          outcome: passed
        - member: junit
          outcome: passed
        - member: tap
          outcome: passed
    certificate_digest: 7ea349e71b1a0814c105fac9380f9544008ede78ff1e2195732bed8c9da2e6dc
    claim_bindings:
      - claim_key: CLAIM-5FD532ADAFB84B98
        requirement_id: REQ-kibi-proof-run-vocabulary
        fact_id: FACT-producer-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - command
            - junit
            - playwright
            - tap
---
Proves that a proof producer shall be command, playwright, junit or tap, against the code Kibi reads at ingest.