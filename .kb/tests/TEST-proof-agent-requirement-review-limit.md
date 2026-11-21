---
title: The agent requirement review queue shall list at most 25 requirements, by an arithmetic proof
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
    - symbol_id: SYM-proof-agent-requirement-review-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-origin-review-agent-requirement-review-limit
  proves:
    - CLAIM-75316AACB6C1F49E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:36:24.803Z'
id: TEST-proof-agent-requirement-review-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cd66c1f50b7d41aa479c131c
    test_id: TEST-proof-agent-requirement-review-limit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5f3b69a51ea0ceb74c8752059d9ea5f63481b8b2cbf5599fa1aa671adbcc62a1
    binding_hash: f4d218b18a19fd2b3e1e023cefdaa8be53cf2f004bc09ff09a1668250f09aa03
    fingerprint: 740fe4d59bcf043c924f76aba77bd34db593f52425e2f0865faa47447c1e4f71
    fingerprint_components:
      contract: 5f3b69a51ea0ceb74c8752059d9ea5f63481b8b2cbf5599fa1aa671adbcc62a1
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
      - symbol_id: SYM-proof-agent-requirement-review-limit
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
      test_id: TEST-proof-agent-requirement-review-limit
      variable: agent_requirement_review_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 25
      claim:
        operator: eq
        value: 25
    certificate_digest: 48c1b3763a9e07965eb21db718c457f39e63d4201fa4aa48462875d4222c541f
    claim_bindings:
      - claim_key: CLAIM-75316AACB6C1F49E
        requirement_id: REQ-kibi-agent-requirement-review-limit
        fact_id: FACT-agent-requirement-review-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 25
          value_type: int
          variable: agent_requirement_review_limit
---
Proves that the agent requirement review queue shall list at most 25 requirements, against the code Kibi reads at ingest.