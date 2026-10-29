---
title: A bootstrap provenance stub shall be tagged bootstrap:provenance-stub, by a regex proof
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
    - symbol_id: SYM-proof-provenance-stub-tag
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-provenance-stub-tag
  proves:
    - CLAIM-06DF3CA2975C9A30
origin:
  kind: agent
  recorded_at: '2026-10-29T16:53:22.090Z'
id: TEST-proof-provenance-stub-tag
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3b882e05151233651edeeff8
    test_id: TEST-proof-provenance-stub-tag
    scope: unit
    outcome: passed
    code_snapshot: a30c5405eea70e799be9d7e6691afbc947056c9986ccf1b9c9ee8c2f836b8849
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:54:01.381Z'
    finished_at: '2026-10-29T16:54:01.536Z'
    artifact_digest: 4abaebaacdde607f4e8f7307f03931245af596be8f7cfe44db190cd54096ab37
    contract_hash: 8c039db59ebe964fc57e3729435b56d91bf5b2e52cc2e1b97de4d6b2c8b1da6d
    binding_hash: 4703407af86538a99fc767e8fdfb4ca535e2a2a5982425a64a84d0c65ff17ada
    fingerprint: efa557eeb08655313fc9224e75895c674d02ac23d9bb7601f7ea086fca7a8e92
    fingerprint_components:
      contract: 8c039db59ebe964fc57e3729435b56d91bf5b2e52cc2e1b97de4d6b2c8b1da6d
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
      - symbol_id: SYM-proof-provenance-stub-tag
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
      test_id: TEST-proof-provenance-stub-tag
      pattern:
        symbol_id: SYM-const-provenance-stub-tag
        type: string
        value: bootstrap:provenance-stub
    certificate_digest: 8dffb1d888cd57135392b2eaa4acf34a3418a186d77bd3f53d204b1dd04f409d
    claim_bindings:
      - claim_key: CLAIM-06DF3CA2975C9A30
        requirement_id: REQ-bootstrap-provenance-stub-tag
        fact_id: FACT-provenance-stub-tag
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: bootstrap:provenance-stub
---
Proves that a bootstrap provenance stub shall be tagged bootstrap:provenance-stub, against the code Kibi reads at ingest.