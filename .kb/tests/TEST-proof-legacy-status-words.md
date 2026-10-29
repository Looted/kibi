---
title: A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected, by an exhaustive proof
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
    - symbol_id: SYM-proof-legacy-status-words
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-migration-suggested-requirement-status
  proves:
    - CLAIM-FF36BA3EB260FAB1
origin:
  kind: agent
  recorded_at: '2026-10-29T10:39:48.653Z'
id: TEST-proof-legacy-status-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-43a0e64da60687a9d9efa791
    test_id: TEST-proof-legacy-status-words
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:44:22.664Z'
    finished_at: '2026-10-29T10:44:22.901Z'
    artifact_digest: a93166e55553b27385ac0a8544924d97131184dfb3b319d89e774d23e410d633
    contract_hash: f7f4c1ab25922c64b97630c17904c1019fb26fdc88339a689803ee6a7b747efe
    binding_hash: 7014881771a8d5dad7724d213f5a6d3b7466ca1f1a9321f6a005f686d0a3e5d9
    fingerprint: 04ba68d2c2234881b602f166962210448ae4a4aa28a80e3d49bb089b8f6fbb1d
    fingerprint_components:
      contract: f7f4c1ab25922c64b97630c17904c1019fb26fdc88339a689803ee6a7b747efe
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
      - symbol_id: SYM-proof-legacy-status-words
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
      test_id: TEST-proof-legacy-status-words
      domain:
        symbol_id: SYM-migration-suggested-requirement-status
        members:
          - accepted
          - proposed
          - draft
          - deprecated
          - superseded
          - rejected
      results:
        - member: accepted
          outcome: passed
        - member: proposed
          outcome: passed
        - member: draft
          outcome: passed
        - member: deprecated
          outcome: passed
        - member: superseded
          outcome: passed
        - member: rejected
          outcome: passed
    certificate_digest: 3ead7c2987494982182ea8b7c47b1222d4b678fddfd83dedeecff00dc6ee001e
    claim_bindings:
      - claim_key: CLAIM-FF36BA3EB260FAB1
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-words
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - accepted
            - deprecated
            - draft
            - proposed
            - rejected
            - superseded
---
Proves that a legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected, against the code Kibi reads at ingest.