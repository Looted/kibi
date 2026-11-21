---
title: The code certificate version shall be kibi.code-certificate.v1, by a regex proof
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
    - symbol_id: SYM-proof-code-certificate-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-code-certificate-version
  proves:
    - CLAIM-C2A64C5B65975AC4
origin:
  kind: agent
  recorded_at: '2026-10-28T20:37:31.673Z'
id: TEST-proof-code-certificate-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6b288fe019ad48aa393ce9bc
    test_id: TEST-proof-code-certificate-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 74c08c1af5a1914d9cbb35d484bc81a62c9cd4ef41767b21a2158775418c1599
    binding_hash: acf0b348c4f4491a859013ad46612bbf7ac68be7e023b8e43a44e2d61e944f4d
    fingerprint: 7f9086f5805da0c933257b53304c7df2f42b4dcc81808fc413d095ff816e7f69
    fingerprint_components:
      contract: 74c08c1af5a1914d9cbb35d484bc81a62c9cd4ef41767b21a2158775418c1599
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
      - symbol_id: SYM-proof-code-certificate-version
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
      test_id: TEST-proof-code-certificate-version
      pattern:
        symbol_id: SYM-const-code-certificate-version
        type: string
        value: kibi.code-certificate.v1
    certificate_digest: 0a0008613ce63d52de2a059fa4c2f3d8cea825334c2fc6a957cde3b594110d80
    claim_bindings:
      - claim_key: CLAIM-C2A64C5B65975AC4
        requirement_id: REQ-kibi-code-certificate-settings
        fact_id: FACT-code-certificate-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.code-certificate.v1
---
Proves that the code certificate version shall be kibi.code-certificate.v1, against the code Kibi reads at ingest.