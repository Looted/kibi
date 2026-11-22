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
    receipt_id: PR-84b76ad142ce2e9e495e797e
    test_id: TEST-proof-origin-review-rules
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 126b75bccd88adeded2b6d0452210947673dbd0a337fc7b33c79dc1bfb0e45c1
    binding_hash: 963226c0f69f2299fadd907a724f715f3e17628b771e07c4a5d7e2bccc54b929
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