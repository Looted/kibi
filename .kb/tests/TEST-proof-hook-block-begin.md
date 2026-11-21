---
title: 'A Kibi-managed hook block shall open with # BEGIN kibi-managed, by a regex proof'
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
    - symbol_id: SYM-proof-hook-block-begin
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-init-helpers-kibi-hook-begin
  proves:
    - CLAIM-BD8967BCDC356469
origin:
  kind: agent
  recorded_at: '2026-10-28T22:40:28.536Z'
id: TEST-proof-hook-block-begin
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-16ab02397bdb9f6d1b3c5278
    test_id: TEST-proof-hook-block-begin
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 469d9f8262d1f1d69205691c13e12cc3a7371ae9239087407b2401fea786a2a8
    binding_hash: d7c0de5b67ac4db8509b6e022b5de1793c5f327d4e8752f000faa04fd5e96729
    fingerprint: 12fc5937b47bb15fa3b1da40981a9e7ea0ff864f381205b91e6ef43fc2149ffc
    fingerprint_components:
      contract: 469d9f8262d1f1d69205691c13e12cc3a7371ae9239087407b2401fea786a2a8
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
      - symbol_id: SYM-proof-hook-block-begin
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
      test_id: TEST-proof-hook-block-begin
      pattern:
        symbol_id: SYM-init-helpers-kibi-hook-begin
        type: string
        value: '# BEGIN kibi-managed'
    certificate_digest: 504fb488305ed8afb15c2eef2e1c0dda2f1c93499785da5e2892b6f2e82b4333
    claim_bindings:
      - claim_key: CLAIM-BD8967BCDC356469
        requirement_id: REQ-git-hook-managed-names
        fact_id: FACT-hook-block-begin
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '# BEGIN kibi-managed'
---
Proves that a Kibi-managed hook block shall open with # BEGIN kibi-managed, against the code Kibi reads at ingest.