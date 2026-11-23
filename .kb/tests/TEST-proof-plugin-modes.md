---
title: A capability plugin mode shall be replace, augment or shadow, by an exhaustive proof
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
    - symbol_id: SYM-proof-plugin-modes
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cap-plugin-plugin-modes-52a9d01a
  proves:
    - CLAIM-9E9ED39996A9AE28
origin:
  kind: agent
  recorded_at: '2026-10-29T10:29:18.568Z'
id: TEST-proof-plugin-modes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d40ad159f6bd57830dd1bdcf
    test_id: TEST-proof-plugin-modes
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: a646e935cd43e6e70516845857e0e785d0fb4ebef4e533db8d20b0b66161701f
    binding_hash: e0d34b492a7401fefcf186b0cde2bc6daa05b7f0818ec1842df4ee209cb7b000
    fingerprint: 19d6c576a790263d952d7c4d84d209f5740a3f66d85d058aa0501d7a8bde1ef7
    fingerprint_components:
      contract: a646e935cd43e6e70516845857e0e785d0fb4ebef4e533db8d20b0b66161701f
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
      - symbol_id: SYM-proof-plugin-modes
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
      test_id: TEST-proof-plugin-modes
      domain:
        symbol_id: SYM-cap-plugin-plugin-modes-52a9d01a
        members:
          - replace
          - augment
          - shadow
      results:
        - member: replace
          outcome: passed
        - member: augment
          outcome: passed
        - member: shadow
          outcome: passed
    certificate_digest: 26e69dbf114b6371653b3a8a4f377e8104c6d837f552a506a62ed0aaed25625c
    claim_bindings:
      - claim_key: CLAIM-9E9ED39996A9AE28
        requirement_id: REQ-capability-plugin-vocabulary
        fact_id: FACT-plugin-modes
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - augment
            - replace
            - shadow
---
Proves that a capability plugin mode shall be replace, augment or shadow, against the code Kibi reads at ingest.