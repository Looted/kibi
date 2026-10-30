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
    receipt_id: PR-a39f57dea4ca65264eda1b7e
    test_id: TEST-proof-hook-block-begin
    scope: unit
    outcome: passed
    code_snapshot: 61057c7cf1c0e4f7b41f6a10eb8401783d829d6dd77415626b66eeeb9f257940
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:41:15.593Z'
    finished_at: '2026-10-28T22:41:15.709Z'
    artifact_digest: f68ba11afdeb166792c98430b8f16ced2507706fccd0e225b91b6c03aeb76ab4
    contract_hash: 469d9f8262d1f1d69205691c13e12cc3a7371ae9239087407b2401fea786a2a8
    binding_hash: 141045b4ad7264fc8dc77211e87fea08bf5c37018ac1b0048e2eb5e9a106afe0
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