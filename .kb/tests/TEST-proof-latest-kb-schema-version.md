---
title: The latest knowledge base schema version shall be 14, by an arithmetic proof
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
    - CLAIM-48C64457D9D6CF6F
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5c9ba6e29c48a20e0d87344a
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: cc7af8fde9cf569fd48df6b98f10b7e2e7e9b457e12c7495f258a1296dc3acad
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T17:36:02.763Z'
    finished_at: '2026-11-11T17:36:02.907Z'
    artifact_digest: e089d3cf9b725021b24df41f7517eaab6cfacace46e895f96e354fbc106d0aaf
    contract_hash: 3a92c969878c07db93e7cf6eca70233fb0854f619ce55ab95cccd5b26365840a
    binding_hash: cb68fcde790976ac49ca21b8da39341c302fe71fedabc157efccc0b55f278cc2
    fingerprint: 4a70d6831598761c7e56e780361a64f680c6647e664a4b1fe570c1bf1e6b9ecf
    fingerprint_components:
      contract: 3a92c969878c07db93e7cf6eca70233fb0854f619ce55ab95cccd5b26365840a
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
          value: 14
      claim:
        operator: eq
        value: 14
    certificate_digest: 6fe1222e8935cad2bf5fb87e1c21bdbe988fe9b65a2e78e4491ec13dffca8dd6
    claim_bindings:
      - claim_key: CLAIM-48C64457D9D6CF6F
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 14
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 14, against the code Kibi reads at ingest.