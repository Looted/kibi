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
    receipt_id: PR-f60e0357b988bd53703926e9
    test_id: TEST-proof-agent-requirement-review-limit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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