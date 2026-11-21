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
    receipt_id: PR-e42c5801eab398dd59e25a82
    test_id: TEST-proof-proof-certificates-env
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 42591e2b5131d72ac375a06de0e3676b7bd32bd00216bc3f1c1f70eddac8c63e
    binding_hash: 751975f99eb4602577ec3d1d0577ddc574f777d3ba177431480140d08ff1c490
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