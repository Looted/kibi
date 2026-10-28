---
title: The Kibi project environment file shall be .env.kibi, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-env-project-file
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-env-bootstrap-kibi-project-env-file
  proves:
    - CLAIM-34904BC7A1521580
origin:
  kind: agent
  recorded_at: '2026-10-28T10:40:46.073Z'
id: TEST-proof-env-project-file
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b7c612d215f9711cbf7d722d
    test_id: TEST-proof-env-project-file
    scope: unit
    outcome: passed
    code_snapshot: ac1f51869130bde5bbcd6fcccc482d5612cd47df0ca46ab9e734b2199b88e0fb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:42:40.083Z'
    finished_at: '2026-10-28T10:42:40.208Z'
    artifact_digest: abcf7c20c68686d2d678b7c6364a1657ac92d645b6a49de1bdf6901e6a9f200e
    contract_hash: 924c62e79ef22c91202e4fe4e4a5775c583235e6b4ca7749940d29adda392727
    binding_hash: 19d0cfb9669fbe6f0f6734132044d50c790ae99f0bf42e58b99ffdf8c9f70720
    fingerprint: 2a5578683c82d1ec8339851f1d47a9f73c920ec322b9666636ab240a96bd45ae
    fingerprint_components:
      contract: 924c62e79ef22c91202e4fe4e4a5775c583235e6b4ca7749940d29adda392727
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
      - symbol_id: SYM-proof-env-project-file
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-env-project-file
      pattern:
        symbol_id: SYM-env-bootstrap-kibi-project-env-file
        type: string
        value: .env.kibi
    certificate_digest: 8fcda0ac0bcee8dc8292c2fd40defaffc0a2c8887df2d604b19a2a421d0973b7
    claim_bindings:
      - claim_key: CLAIM-34904BC7A1521580
        requirement_id: REQ-kibi-env-bootstrap-files
        fact_id: FACT-env-project-file
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .env.kibi
---
Proves that the Kibi project environment file shall be .env.kibi, against the code Kibi reads at ingest.