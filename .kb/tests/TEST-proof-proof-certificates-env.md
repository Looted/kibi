---
title: The proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES, by a regex proof
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
    - symbol_id: SYM-proof-proof-certificates-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-certificates-env
  proves:
    - CLAIM-814D7EBFC0615F2A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:37:54.685Z'
id: TEST-proof-proof-certificates-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fe1e466051c22f2193c045b4
    test_id: TEST-proof-proof-certificates-env
    scope: unit
    outcome: passed
    code_snapshot: bc1213c2370b5f78c97ee31d99b3edbe5c80d361104c881245f13169e433a917
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:40:34.374Z'
    finished_at: '2026-10-28T20:40:34.487Z'
    artifact_digest: 881f192351b3a04eee3631ebaf91fd9b99b9298e5ed112147f35f52d698f0078
    contract_hash: 42591e2b5131d72ac375a06de0e3676b7bd32bd00216bc3f1c1f70eddac8c63e
    binding_hash: 1ac4db75f2855727b48467759fa73cc8026352c611e6bba118f5107e160869fb
    fingerprint: f0d52bb213f68847d1e99be32ff2df68d3bf9b2a78cdf4b33b5ae487da5a2eb9
    fingerprint_components:
      contract: 42591e2b5131d72ac375a06de0e3676b7bd32bd00216bc3f1c1f70eddac8c63e
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
      - symbol_id: SYM-proof-proof-certificates-env
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
      test_id: TEST-proof-proof-certificates-env
      pattern:
        symbol_id: SYM-const-proof-certificates-env
        type: string
        value: KIBI_PROOF_CERTIFICATES
    certificate_digest: 762c65ff7d5404ea04ed027ebc1163e0c832ff73b7cca3de74d965fb3b1fd776
    claim_bindings:
      - claim_key: CLAIM-814D7EBFC0615F2A
        requirement_id: REQ-kibi-code-certificate-settings
        fact_id: FACT-proof-certificates-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_PROOF_CERTIFICATES
---
Proves that the proof certificates environment variable shall be KIBI_PROOF_CERTIFICATES, against the code Kibi reads at ingest.