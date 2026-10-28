---
title: A proof success policy shall be all_required_first_attempt or own_results_first_attempt, by an exhaustive proof
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
    - symbol_id: SYM-proof-success-policies
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-success-policies
  proves:
    - CLAIM-60D2AD30E0E5B204
origin:
  kind: agent
  recorded_at: '2026-10-28T17:48:15.622Z'
id: TEST-proof-success-policies
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-58b57f01d9322896820ebbfd
    test_id: TEST-proof-success-policies
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:10.926Z'
    finished_at: '2026-10-28T17:52:11.141Z'
    artifact_digest: e38884e8d649de326766150379f42f2785a1de52e9122720111f9828e4a6165a
    contract_hash: 04a9641be48dfc89531e1ae1129625a1a937fd0e67f6ae7bec0c1ea60570c349
    binding_hash: bebe473410fdbb65e401e7b45a44b0b330ac0780016318980a27cd6c2a6482d3
    fingerprint: 340f53d03ebfeaeef11a9bb14b3eea5b6d00d6d8a5e0f1fbcf9de19854e501c1
    fingerprint_components:
      contract: 04a9641be48dfc89531e1ae1129625a1a937fd0e67f6ae7bec0c1ea60570c349
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
      - symbol_id: SYM-proof-success-policies
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
      test_id: TEST-proof-success-policies
      domain:
        symbol_id: SYM-success-policies
        members:
          - all_required_first_attempt
          - own_results_first_attempt
      results:
        - member: all_required_first_attempt
          outcome: passed
        - member: own_results_first_attempt
          outcome: passed
    certificate_digest: 197d23c9cee35c540d485f4ca9cb5988cb3d4dea7c1f91e241fb74d5cf4ec05e
    claim_bindings:
      - claim_key: CLAIM-60D2AD30E0E5B204
        requirement_id: REQ-kibi-proof-run-vocabulary
        fact_id: FACT-success-policies
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - all_required_first_attempt
            - own_results_first_attempt
---
Proves that a proof success policy shall be all_required_first_attempt or own_results_first_attempt, against the code Kibi reads at ingest.