---
title: The KB manifest version shall be 1, by an arithmetic proof
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
    - symbol_id: SYM-proof-kb-manifest-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-canonical-KB_MANIFEST_VERSION
  proves:
    - CLAIM-BB1499C9D00BD828
origin:
  kind: agent
  recorded_at: '2026-10-28T19:01:43.659Z'
id: TEST-proof-kb-manifest-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-08f9a5408386c48331b20ee0
    test_id: TEST-proof-kb-manifest-version
    scope: unit
    outcome: passed
    code_snapshot: 5d36459f22881f6c22e3bac5ea8974c74bd15e1de4958b06df142b9e5eb07350
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:03:23.726Z'
    finished_at: '2026-10-28T19:03:23.833Z'
    artifact_digest: 65b2844159d7c00a123e4be6dc39ff01e2c96a643ee0cc8e83926e8f4b12a60e
    contract_hash: 966b1eb6994b508d9236e910d085a4ae204116072dc1a4a2b3df0ec4f2b2ab5b
    binding_hash: b5b662573898ea03e624f817d7d92342bcde20479ec4eff7c09a0a945fb977f2
    fingerprint: 7d536804aecddc25d73d567baa18a82afbb96406dd6faca8a459d76c07455600
    fingerprint_components:
      contract: 966b1eb6994b508d9236e910d085a4ae204116072dc1a4a2b3df0ec4f2b2ab5b
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
      - symbol_id: SYM-proof-kb-manifest-version
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
      test_id: TEST-proof-kb-manifest-version
      variable: manifest_version
      value_type: int
      assumptions:
        - operator: eq
          value: 1
      claim:
        operator: eq
        value: 1
    certificate_digest: 2e860a9e305906a6a422b1786e53af7e639e2d7b865999f00211e9db79cc3b99
    claim_bindings:
      - claim_key: CLAIM-BB1499C9D00BD828
        requirement_id: REQ-cli-kb-layout-paths
        fact_id: FACT-kb-manifest-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1
          value_type: int
          variable: manifest_version
---
Proves that the KB manifest version shall be 1, against the code Kibi reads at ingest.