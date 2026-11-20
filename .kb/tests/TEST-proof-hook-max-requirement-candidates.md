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
    receipt_id: PR-983e468a79c21183b2e8e5cb
    test_id: TEST-proof-hook-max-requirement-candidates
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5910f435354d2339103aa65ecfe1caef4cebaf7e7d28b12d3b1ca7dd334aee63
    binding_hash: f00d24e5e6ec245def6a47b6c8185c05f21a4f2f6138e2b01ba5386a0d59197c
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