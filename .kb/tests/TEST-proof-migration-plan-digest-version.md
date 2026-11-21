---
title: The migration plan digest version shall be kibi.migration-plan-digest.v2, by a regex proof
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
    - symbol_id: SYM-proof-migration-plan-digest-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-migration-plan-digest-version
  proves:
    - CLAIM-4E3E2EB3D1E7A917
origin:
  kind: agent
  recorded_at: '2026-10-28T20:55:49.547Z'
id: TEST-proof-migration-plan-digest-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6722f92b3db9eb64bf63f02d
    test_id: TEST-proof-migration-plan-digest-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b655105a369353d591f149a7825998ed09b7e063a99e196fa773dadbd18be7fd
    binding_hash: 9f1dfcabd1f0ad0d1cd76f50c64b3a797b091f91811b15c438701beccb192d10
    fingerprint: f88d1e5829848ae85db14331184ec1d8d38a506ee9a8bb2694641e08c8effdd4
    fingerprint_components:
      contract: b655105a369353d591f149a7825998ed09b7e063a99e196fa773dadbd18be7fd
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
      - symbol_id: SYM-proof-migration-plan-digest-version
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
      test_id: TEST-proof-migration-plan-digest-version
      pattern:
        symbol_id: SYM-const-migration-plan-digest-version
        type: string
        value: kibi.migration-plan-digest.v2
    certificate_digest: 1779312e537b22e7a89d06a40a6aff8568257bdeb1e879b3580f919fe693ed19
    claim_bindings:
      - claim_key: CLAIM-4E3E2EB3D1E7A917
        requirement_id: REQ-agent-migration-plan-versions
        fact_id: FACT-migration-plan-digest-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.migration-plan-digest.v2
---
Proves that the migration plan digest version shall be kibi.migration-plan-digest.v2, against the code Kibi reads at ingest.