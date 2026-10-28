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
    receipt_id: PR-0757a341a36a75f2dde738ce
    test_id: TEST-proof-agent-requirement-review-limit
    scope: unit
    outcome: passed
    code_snapshot: c1770862c701357e37759c396893fafa0ece5765b1ecc603a5eb51bb6842aeaf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:36:53.938Z'
    finished_at: '2026-10-28T10:36:54.060Z'
    artifact_digest: af6bf3163fa335b4f95de50439f55904765813f06ceb2f5fa8f981460eb248d7
    contract_hash: 5f3b69a51ea0ceb74c8752059d9ea5f63481b8b2cbf5599fa1aa671adbcc62a1
    binding_hash: 83afbad2cfca4865ac1de3722feae3bea2d8018eb432ae8770939291f9deef20
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