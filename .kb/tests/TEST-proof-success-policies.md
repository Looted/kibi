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
    receipt_id: PR-b10176fdbeb33d0727ebb1ef
    test_id: TEST-proof-success-policies
    scope: unit
    outcome: passed
    code_snapshot: 687a75b3c57bd11cbd5b1b79fcfa7589e153fe88b2edd678594f1eb4f347fdda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:11:44.143Z'
    finished_at: '2026-11-16T11:13:25.311Z'
    artifact_digest: f79044ea9b4e1d539c65f539f226328db9b08c254176cc9b90d70a7f30e8803c
    contract_hash: 04a9641be48dfc89531e1ae1129625a1a937fd0e67f6ae7bec0c1ea60570c349
    binding_hash: 37f3ed61a0b04d82faa65a93f66162ff45310a799490190f5aede471190dc883
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
        requirement_id: REQ-kibi-proof-contract-vocabulary
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