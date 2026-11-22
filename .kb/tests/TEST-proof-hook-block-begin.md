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
    receipt_id: PR-e4287aec8794afff6e807ad2
    test_id: TEST-proof-hook-block-begin
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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