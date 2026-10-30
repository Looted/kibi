---
title: Every evidence floor holds every level to its rank
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
    - symbol_id: SYM-test-evidence-floors-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels
  proves:
    - CLAIM-5E55F75819F9B574
    - CLAIM-9ACBC2020046F07B
    - CLAIM-1051157D755BBE40
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:45.614Z'
id: TEST-kibi-evidence-floors-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4c159135af75ec1d9f889b3e
    test_id: TEST-kibi-evidence-floors-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: f28722f7660a882a57ee32674c16399e57f709d942764918804ea85d33167119
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-30T12:52:11.268Z'
    finished_at: '2026-10-30T12:52:12.098Z'
    artifact_digest: aa303ddeb5cf7edfbe1b73a10a0f3029fbdbf4fb7309200533ced4d7695bfb2f
    contract_hash: a3e3d46fd6bb1153f5b4ab27b5f1fb9a56f0b47c5b73eee9ee36d6996291ed30
    binding_hash: 4fb3b8624e36b7a34034553e6a2a77a87485576e5711d25effadcf42d1a636a4
    fingerprint: 5553ab368ee0067a1d00e09a5cfaf4d2a68597d04c6c9cc6787236bf6dcd77e3
    fingerprint_components:
      contract: a3e3d46fd6bb1153f5b4ab27b5f1fb9a56f0b47c5b73eee9ee36d6996291ed30
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
      - symbol_id: SYM-test-evidence-floors-exhaustive
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
      test_id: TEST-kibi-evidence-floors-exhaustive
      domain:
        symbol_id: SYM-cli-evidence-levels
        members:
          - proved
          - tested
          - asserted
          - unverified
      results:
        - member: proved
          outcome: passed
        - member: tested
          outcome: passed
        - member: asserted
          outcome: passed
        - member: unverified
          outcome: passed
    certificate_digest: cbd8244ab6998fd003a549da25f6975d7a4e2b1eca3638546a0c1b40e46e816c
    claim_bindings:
      - claim_key: CLAIM-5E55F75819F9B574
        requirement_id: REQ-kibi-evidence-floors
        fact_id: FACT-kibi-evidence-floor-blocks
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - asserted
            - proved
            - tested
            - unverified
      - claim_key: CLAIM-9ACBC2020046F07B
        requirement_id: REQ-kibi-evidence-floors
        fact_id: FACT-kibi-evidence-floor-pending-reproof
        binding: attested
        scope: code
      - claim_key: CLAIM-1051157D755BBE40
        requirement_id: REQ-kibi-evidence-floors
        fact_id: FACT-kibi-evidence-floor-fresh-evidence
        binding: attested
        scope: code
---
Checks every member of EVIDENCE_LEVELS as a floor, stated or derived from each firmness, against every evidence level and gap set: evidence_floor reports met, pending re-proof or below by rank, and kibi check fails exactly the requirements below their floor, plus pending re-proof ones under --fresh-evidence; the run leaves an exhaustive certificate over EVIDENCE_LEVELS.