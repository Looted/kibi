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
    receipt_id: PR-8c39032c346c4370d0fd4d0f
    test_id: TEST-proof-github-placeholder-repo
    scope: unit
    outcome: passed
    code_snapshot: 7f5f3cbf07bcd668a6ba1d822ce431959e51a6f2bdc18ca3aef8600b71016261
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:24:28.886Z'
    finished_at: '2026-10-29T10:24:29.079Z'
    artifact_digest: f43f7c393c7cf8af7c82549aabb3d362c7291bbdff093820470c61c2dd0b6fb5
    contract_hash: 57b933026ba5226e730d85a551e55bb71f6f74b80844da31410ab8bffbfee1f6
    binding_hash: 03d763467661f5e116808924cc1394bcbeb94a35fbcb47318d44f406d4d16bef
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