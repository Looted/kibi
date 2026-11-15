---
title: The latest knowledge base schema version shall be 18, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-latest-kb-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-LATEST-KB-SCHEMA-VERSION
  proves:
    - CLAIM-821C4C60E832D7CE
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1df080835cb0b5b5f2cb1681
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 6fd9a4bfa27027cd64e725c78e092bacee0c8b3d904976a0536b8181d7871dd0
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T07:26:55.277Z'
    finished_at: '2026-11-13T07:26:55.428Z'
    artifact_digest: 7fbb6dccbe392cbe157ff45f8818f6267f1612523ac1091039bcb021200a1f30
    contract_hash: 405dd8b0ae7ec3e0c5a1e2e1fa9176d5c70fd0ce2268d5c33f120e4ab592187b
    binding_hash: 444317445237058284c7633289587cf15fda9327ecf0d87e6965e6176f2d5874
    fingerprint: b7fa7ac261ed040cdc90ec6c1cdf9b81f74db411c5e0806a6beacc9449dedcb1
    fingerprint_components:
      contract: 405dd8b0ae7ec3e0c5a1e2e1fa9176d5c70fd0ce2268d5c33f120e4ab592187b
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
      - symbol_id: SYM-proof-latest-kb-schema-version
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-latest-kb-schema-version
      variable: latest_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 18
      claim:
        operator: eq
        value: 18
    certificate_digest: 4d047c9b8791eadf0e142d5ff85250da3c5c96d24e33b7d244843a5bbebeb306
    claim_bindings:
      - claim_key: CLAIM-821C4C60E832D7CE
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 18
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 18, against the code Kibi reads at ingest.