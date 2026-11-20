---
title: The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml, by a regex proof
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
    - symbol_id: SYM-proof-github-badge-workflow-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-github-badge-workflow-relpath
  proves:
    - CLAIM-8B3298DD4D426818
origin:
  kind: agent
  recorded_at: '2026-10-29T10:18:45.655Z'
id: TEST-proof-github-badge-workflow-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-332f27d98f141e92b5f8870c
    test_id: TEST-proof-github-badge-workflow-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a3b95d3b99679f5f1cea7e6292ce40764e538af949e97419c196a913abccbeb1
    binding_hash: 6c4f3806dbe9a0a6c15424c3602fa209633174110bb8b6f1e279b26945807b74
    fingerprint: fdfb8f9e00f44322a30d9c28eca1466eead31b65efc58b7c7e079d8504c63717
    fingerprint_components:
      contract: a3b95d3b99679f5f1cea7e6292ce40764e538af949e97419c196a913abccbeb1
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
      - symbol_id: SYM-proof-github-badge-workflow-path
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
      test_id: TEST-proof-github-badge-workflow-path
      pattern:
        symbol_id: SYM-cli-github-badge-workflow-relpath
        type: string
        value: .github/workflows/kibi-badge.yml
    certificate_digest: 4ff044bd4ae0a85654e973fb4cffaf3e5d75d763d002874cf99fb89ca3fce00a
    claim_bindings:
      - claim_key: CLAIM-8B3298DD4D426818
        requirement_id: REQ-kibi-github-report-settings
        fact_id: FACT-github-badge-workflow-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .github/workflows/kibi-badge.yml
---
Proves that the Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml, against the code Kibi reads at ingest.