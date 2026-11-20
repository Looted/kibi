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
    receipt_id: PR-2bb10d07773eb9f7e2a13511
    test_id: TEST-proof-kb-manifest-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 966b1eb6994b508d9236e910d085a4ae204116072dc1a4a2b3df0ec4f2b2ab5b
    binding_hash: e9a20aff14601f2aaa35db1e2662ae1a3470b45962ccfbb941bea81790506767
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