---
title: The proof contract version shall be kibi.proof-contract.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-contract-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-contract-version
  proves:
    - CLAIM-C6F779A76BBB4581
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:11.658Z'
id: TEST-proof-proof-contract-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-45b5baff25cd4a47636c9f0e
    test_id: TEST-proof-proof-contract-version
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:03.034Z'
    finished_at: '2026-11-16T12:24:32.903Z'
    artifact_digest: 1bbb6b9d182a9bfb24ff6904410f4b4360b68d3d7cb4e22c1a4598f12fc5a58f
    contract_hash: df4d7c89a0a63d35dbce47bd4bbd0cbc054f7dc49f645c7eb28576ce3822c0de
    binding_hash: a82387b27c32dd2396abd3092a4deb4dc2071f70761f5df685dde22ba6852131
    fingerprint: e6e5932ee212aacaf13b4d940bdf2974409b8aeb1543f5b1cd2d42066c9b5a14
    fingerprint_components:
      contract: df4d7c89a0a63d35dbce47bd4bbd0cbc054f7dc49f645c7eb28576ce3822c0de
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
      - symbol_id: SYM-proof-proof-contract-version
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
      test_id: TEST-proof-proof-contract-version
      pattern:
        symbol_id: SYM-proof-contract-version
        type: string
        value: kibi.proof-contract.v1
    certificate_digest: 23b171c696a0e9c74ef731e650383f12cbf28619c62570c8b216a6f2759e5c12
    claim_bindings:
      - claim_key: CLAIM-C6F779A76BBB4581
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-contract-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-contract.v1
---
Proves that the proof contract version shall be kibi.proof-contract.v1, against the code Kibi reads at ingest.