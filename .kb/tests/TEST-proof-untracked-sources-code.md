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
    receipt_id: PR-812edd71e887f79551991d76
    test_id: TEST-proof-untracked-sources-code
    scope: unit
    outcome: passed
    code_snapshot: 9d5c809154467be6acfd269eb08afb5aca0715b26530e00d26a714dc949a439f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:56:19.488Z'
    finished_at: '2026-10-28T18:56:19.708Z'
    artifact_digest: 3f74b8e0721398950f80dea9f3fd2cd0afc9a0fb0243812680219688a5ba982a
    contract_hash: 13cb27df0ba969a9284f5eee056191206f90612b553b1afc2aba06595cfc3f39
    binding_hash: 5300bac375d9f12ccb7872c6ec5245424dd7026b6ca2431c79a026cafce87637
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