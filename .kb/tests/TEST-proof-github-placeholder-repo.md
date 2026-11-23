---
title: The placeholder repository name shall be REPOSITORY, by a regex proof
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
    - symbol_id: SYM-proof-github-placeholder-repo
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-github-placeholder-repo
  proves:
    - CLAIM-3CE88F3B9079CA71
origin:
  kind: agent
  recorded_at: '2026-10-29T10:20:55.048Z'
id: TEST-proof-github-placeholder-repo
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7eb83be71beab2271b1c7b96
    test_id: TEST-proof-github-placeholder-repo
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 57b933026ba5226e730d85a551e55bb71f6f74b80844da31410ab8bffbfee1f6
    binding_hash: 4d5c15789d8b3086ce7681647f2f15bd18eb59b430b7c7c5323897e3c62bc782
    fingerprint: 01860fe7cf79fc9420e1c22a5daf63b415c11320dab3da607537b923c34ea4c4
    fingerprint_components:
      contract: 57b933026ba5226e730d85a551e55bb71f6f74b80844da31410ab8bffbfee1f6
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
      - symbol_id: SYM-proof-github-placeholder-repo
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
      test_id: TEST-proof-github-placeholder-repo
      pattern:
        symbol_id: SYM-cli-github-placeholder-repo
        type: string
        value: REPOSITORY
    certificate_digest: 7fbc66b9b5f61c2b530341bb379c167146843f21adf8cc40a6e5541bcf4436f9
    claim_bindings:
      - claim_key: CLAIM-3CE88F3B9079CA71
        requirement_id: REQ-kibi-github-report-settings
        fact_id: FACT-github-placeholder-repo
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: REPOSITORY
---
Proves that the placeholder repository name shall be REPOSITORY, against the code Kibi reads at ingest.