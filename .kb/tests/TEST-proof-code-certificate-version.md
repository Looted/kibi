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
    receipt_id: PR-fca7f03d9bc456b3e85884fb
    test_id: TEST-proof-code-certificate-version
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:23:37.996Z'
    finished_at: '2026-11-16T12:23:56.702Z'
    artifact_digest: 57a0a32e0d7704e27c251804647b7fbd6b59618c39cc94f5c0297939a79cad2b
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