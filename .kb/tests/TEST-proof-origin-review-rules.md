---
title: The origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing, by an exhaustive proof
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
    - symbol_id: SYM-proof-origin-review-rules
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-origin-review-rules
  proves:
    - CLAIM-F224C3BF5AE9F4B9
origin:
  kind: agent
  recorded_at: '2026-10-28T11:01:38.820Z'
id: TEST-proof-origin-review-rules
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-73687d8929a89a68c371306e
    test_id: TEST-proof-origin-review-rules
    scope: unit
    outcome: passed
    code_snapshot: 3fc412bb59139c2d3e14abfb073b0c0c51d8325614126c3ecb530445537bd05b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:02:19.752Z'
    finished_at: '2026-10-28T11:02:19.862Z'
    artifact_digest: 990ad73fb46e5aa85f3c990cde842bd9ba5252d09c583f8cda396c8fbf4ca43e
    contract_hash: 126b75bccd88adeded2b6d0452210947673dbd0a337fc7b33c79dc1bfb0e45c1
    binding_hash: 7bbce81cb7b464f47994a7ed3e7329a6433265a2f7d55309c76dba1e26ce5530
    fingerprint: 35376f7cc5ac050c5b4e37b1c37a973ad01b68672e10af6094293cf563c60531
    fingerprint_components:
      contract: 126b75bccd88adeded2b6d0452210947673dbd0a337fc7b33c79dc1bfb0e45c1
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
      - symbol_id: SYM-proof-origin-review-rules
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
      test_id: TEST-proof-origin-review-rules
      domain:
        symbol_id: SYM-const-origin-review-rules
        members:
          - exception-unapproved
          - exception-approval-self-attested
          - agent-requirement-unapproved
          - requirement-rationale-missing
      results:
        - member: exception-unapproved
          outcome: passed
        - member: exception-approval-self-attested
          outcome: passed
        - member: agent-requirement-unapproved
          outcome: passed
        - member: requirement-rationale-missing
          outcome: passed
    certificate_digest: 9d963df6d9836ac5db54195f219709cc523ac910b2e307966eb9cb106effc74b
    claim_bindings:
      - claim_key: CLAIM-F224C3BF5AE9F4B9
        requirement_id: REQ-kibi-entity-origin-vocabulary
        fact_id: FACT-origin-review-rules
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - agent-requirement-unapproved
            - exception-approval-self-attested
            - exception-unapproved
            - requirement-rationale-missing
---
Proves that the origin review rules shall be exception-unapproved, exception-approval-self-attested, agent-requirement-unapproved and requirement-rationale-missing, against the code Kibi reads at ingest.