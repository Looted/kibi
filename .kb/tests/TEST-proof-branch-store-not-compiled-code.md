---
title: The uncompiled branch store code shall be branch_store_not_compiled, by a regex proof
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
    - symbol_id: SYM-proof-branch-store-not-compiled-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-branch-store-not-compiled
  proves:
    - CLAIM-D88F66E3CFF971F6
origin:
  kind: agent
  recorded_at: '2026-10-28T20:43:11.699Z'
id: TEST-proof-branch-store-not-compiled-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e3a680e951455c444d002dfa
    test_id: TEST-proof-branch-store-not-compiled-code
    scope: unit
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:45:10.471Z'
    finished_at: '2026-10-28T20:45:10.572Z'
    artifact_digest: b31fbd3c455783ae3f0a91f4bf64fa1682374e4540d6fa01e78bdbf9e3a7d12a
    contract_hash: 52424034408fdf53afa51010ff0f53fe1ca49e0b8932c8a75b7f0310d8ed0271
    binding_hash: ec5f6909aa02dbdadb257a46e708113029e09b87a8526107eca07e8987997e69
    fingerprint: a091d23a8e705936c3d12bf28bbe135cc830a3e6ea4073826934e9bc6bdedab8
    fingerprint_components:
      contract: 52424034408fdf53afa51010ff0f53fe1ca49e0b8932c8a75b7f0310d8ed0271
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
      - symbol_id: SYM-proof-branch-store-not-compiled-code
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
      test_id: TEST-proof-branch-store-not-compiled-code
      pattern:
        symbol_id: SYM-const-branch-store-not-compiled
        type: string
        value: branch_store_not_compiled
    certificate_digest: 4abab526b75c7170c79e2d45000814b3925148f04619aa3ac98baad1ed6309c2
    claim_bindings:
      - claim_key: CLAIM-D88F66E3CFF971F6
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-branch-store-not-compiled-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: branch_store_not_compiled
---
Proves that the uncompiled branch store code shall be branch_store_not_compiled, against the code Kibi reads at ingest.