---
title: The untracked knowledge sources step code shall be untracked_knowledge_sources, by a regex proof
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
    - symbol_id: SYM-proof-untracked-sources-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-plan-untracked-knowledge-sources-code
  proves:
    - CLAIM-6E45B28D0A8D8DFE
origin:
  kind: agent
  recorded_at: '2026-10-28T18:54:18.360Z'
id: TEST-proof-untracked-sources-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6275feec0e27e3b59c9fc7db
    test_id: TEST-proof-untracked-sources-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 13cb27df0ba969a9284f5eee056191206f90612b553b1afc2aba06595cfc3f39
    binding_hash: 6fef4d82cf6f81c9fca43dfecef7e9af8f1aeaf9862bc561e0dbbcb8e6f3c825
    fingerprint: e56f93a29a518b463da178d7f8b6c8a75bbe07edfbae9660348cb86dfdadcebe
    fingerprint_components:
      contract: 13cb27df0ba969a9284f5eee056191206f90612b553b1afc2aba06595cfc3f39
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
      - symbol_id: SYM-proof-untracked-sources-code
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
      test_id: TEST-proof-untracked-sources-code
      pattern:
        symbol_id: SYM-migration-plan-untracked-knowledge-sources-code
        type: string
        value: untracked_knowledge_sources
    certificate_digest: ad2519a102d0fe238a071527d0ddf886c4d149745249cece41208dccfef79b3e
    claim_bindings:
      - claim_key: CLAIM-6E45B28D0A8D8DFE
        requirement_id: REQ-agent-migration-plan-codes
        fact_id: FACT-untracked-sources-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: untracked_knowledge_sources
---
Proves that the untracked knowledge sources step code shall be untracked_knowledge_sources, against the code Kibi reads at ingest.