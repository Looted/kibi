---
title: The symbol coordinates format version shall be 2, by an arithmetic proof
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
    - symbol_id: SYM-proof-symbol-coordinates-format-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-SYMBOL_COORDINATES_FORMAT_VERSION
  proves:
    - CLAIM-EEBE9761ABA24406
origin:
  kind: agent
  recorded_at: '2026-10-28T11:13:51.025Z'
id: TEST-proof-symbol-coordinates-format-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7bad190592fb4c6095b39e93
    test_id: TEST-proof-symbol-coordinates-format-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: ac27d7fb5c8d3ea8e3c11d1b73a7d042530db90bd235763be341329014b60be0
    binding_hash: d0254c1786d38ca9eb79223613f79bea98ecda7f0cccf577a29598f9bc4e994e
    fingerprint: 8323792b66144bd64bcf632015774d0710ebe4a74f80ac769859a5045d1f62a7
    fingerprint_components:
      contract: ac27d7fb5c8d3ea8e3c11d1b73a7d042530db90bd235763be341329014b60be0
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
      - symbol_id: SYM-proof-symbol-coordinates-format-version
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
      test_id: TEST-proof-symbol-coordinates-format-version
      variable: format_version
      value_type: int
      assumptions:
        - operator: eq
          value: 2
      claim:
        operator: eq
        value: 2
    certificate_digest: 3dacec2e2cee105b80f55e85557c42486e5bc6f481278c1dc05655014b18d2a6
    claim_bindings:
      - claim_key: CLAIM-EEBE9761ABA24406
        requirement_id: REQ-generated-coordinate-settings
        fact_id: FACT-symbol-coordinates-format-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 2
          value_type: int
          variable: format_version
---
Proves that the symbol coordinates format version shall be 2, against the code Kibi reads at ingest.