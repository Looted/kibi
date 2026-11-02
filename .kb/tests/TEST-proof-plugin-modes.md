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
    receipt_id: PR-1a50aea1af954bf764cb98b6
    test_id: TEST-proof-plugin-modes
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:52:13.157Z'
    finished_at: '2026-10-30T19:52:13.258Z'
    artifact_digest: a7b211c5ab9ad6ee47a4a4d1b134578590649cb64b4c3e3639b6406b2fa8de63
    contract_hash: a646e935cd43e6e70516845857e0e785d0fb4ebef4e533db8d20b0b66161701f
    binding_hash: 2b4a92c02dad5ae3ae943d8cebe37240e8622f726b9837de7f965bdbc9f7fd7a
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