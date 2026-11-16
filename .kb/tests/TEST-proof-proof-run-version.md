---
title: The proof run version shall be kibi.proof-run.v1, by a regex proof
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
    - symbol_id: SYM-proof-proof-run-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-run-version
  proves:
    - CLAIM-BC55CA4697B8540B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:49.228Z'
id: TEST-proof-proof-run-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c48c3e4b5717c2261899454b
    test_id: TEST-proof-proof-run-version
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:03.034Z'
    finished_at: '2026-11-16T12:24:32.903Z'
    artifact_digest: 1bbb6b9d182a9bfb24ff6904410f4b4360b68d3d7cb4e22c1a4598f12fc5a58f
    contract_hash: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
    binding_hash: 10064fb9f33c9235a19d725602c5ca18ef6e717f0aed82e3d00aa13f9a7fb376
    fingerprint: 5a990ddb4e5a7589f4a4f8054eccede6636c9dd82dc25e72c366be8cb9854e7d
    fingerprint_components:
      contract: c1e675af355feb87f904dae15b1efd6238ca009ff4cf032a59cc60f2dff4c655
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
      - symbol_id: SYM-proof-proof-run-version
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
      test_id: TEST-proof-proof-run-version
      pattern:
        symbol_id: SYM-proof-run-version
        type: string
        value: kibi.proof-run.v1
    certificate_digest: d7c9b9b250c53d5ca4165434892ce5342a37d946d490e5e91b525fc90747eebf
    claim_bindings:
      - claim_key: CLAIM-BC55CA4697B8540B
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-run-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-run.v1
---
Proves that the proof run version shall be kibi.proof-run.v1, against the code Kibi reads at ingest.