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
    receipt_id: PR-cd0eee16330e0c6d003b6047
    test_id: TEST-proof-legacy-status-words
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f7f4c1ab25922c64b97630c17904c1019fb26fdc88339a689803ee6a7b747efe
    binding_hash: db252781238f4cbc116d6cbe5b030bf659312cc11bff290101059544e79fc952
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