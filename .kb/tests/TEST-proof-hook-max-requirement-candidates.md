---
title: A hook shall offer at most 3 requirement candidates, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-hook-max-requirement-candidates
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-agent-core-candidates-max-requirement-candidates
  proves:
    - CLAIM-C133FB4D31CABA59
origin:
  kind: agent
  recorded_at: '2026-10-29T16:30:51.752Z'
id: TEST-proof-hook-max-requirement-candidates
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b52bf07fbd8d7d9bad162fd0
    test_id: TEST-proof-hook-max-requirement-candidates
    scope: unit
    outcome: passed
    code_snapshot: 8d023642f2d3b7e5339d3b88aef78ca7225877c8dc42ff4f947c96219805b463
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:32:48.322Z'
    finished_at: '2026-10-29T16:32:48.509Z'
    artifact_digest: 9b310b0f1e56467a58731e6c46b8275e3fa4845c17ee53e0343c9e6d782512f7
    contract_hash: 5910f435354d2339103aa65ecfe1caef4cebaf7e7d28b12d3b1ca7dd334aee63
    binding_hash: 4e06adce7f262d521641b1787f9d8822ab5be5b68860176d0ea67b0fec3bfdc0
    fingerprint: b4ce2ea3218596b87a73989ebfdd143962b48022f940bbff6afb9805fcd1e3d7
    fingerprint_components:
      contract: 5910f435354d2339103aa65ecfe1caef4cebaf7e7d28b12d3b1ca7dd334aee63
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
      - symbol_id: SYM-proof-hook-max-requirement-candidates
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-hook-max-requirement-candidates
      variable: max_candidates
      value_type: int
      assumptions:
        - operator: eq
          value: 3
      claim:
        operator: eq
        value: 3
    certificate_digest: cd9715cbec5857f80ea696e369420994b85a4588dea6c0b0ced70fd1d4c5d256
    claim_bindings:
      - claim_key: CLAIM-C133FB4D31CABA59
        requirement_id: REQ-agent-core-hook-limits
        fact_id: FACT-hook-max-requirement-candidates
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 3
          value_type: int
          variable: max_candidates
---
Proves that a hook shall offer at most 3 requirement candidates, against the code Kibi reads at ingest.