---
title: The semantic advisor version shall be semantic-advisor-v2, by a regex proof
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
    - symbol_id: SYM-proof-semantic-advisor-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-SEMANTIC_ADVISOR_VERSION
  proves:
    - CLAIM-38D29BB8E64E19E3
origin:
  kind: agent
  recorded_at: '2026-10-28T19:15:16.342Z'
id: TEST-proof-semantic-advisor-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-32061cd918911a488f824a4c
    test_id: TEST-proof-semantic-advisor-version
    scope: unit
    outcome: passed
    code_snapshot: 5dbf5378436c37c75e9104c48b222f0ae984ea474679ffbc2c4a8878882ee3ad
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:17:01.791Z'
    finished_at: '2026-10-28T19:17:01.908Z'
    artifact_digest: a219557346da2c6f2f4c487e530840a24e65c5d456fa4e7306cef50758ff42ad
    contract_hash: 927e57b1f1757de38b94a3f3dfc511afcb7738c306814fbc3dba525133c9d228
    binding_hash: b16b9445db32cb6d4228842d092d2529d8c8ca1e6ce3c716e1d68f9af4df3d64
    fingerprint: 0cbbc8028565b5eb5115e2f1f5aa701422477846012285eb390fdf89fb51c075
    fingerprint_components:
      contract: 927e57b1f1757de38b94a3f3dfc511afcb7738c306814fbc3dba525133c9d228
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
      - symbol_id: SYM-proof-semantic-advisor-version
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
      test_id: TEST-proof-semantic-advisor-version
      pattern:
        symbol_id: SYM-SEMANTIC_ADVISOR_VERSION
        type: string
        value: semantic-advisor-v2
    certificate_digest: ec03845be279336c7dc86de75871e38158458c0f080e34dced54e1e060e42924
    claim_bindings:
      - claim_key: CLAIM-38D29BB8E64E19E3
        requirement_id: REQ-semantic-advisor-version
        fact_id: FACT-semantic-advisor-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic-advisor-v2
---
Proves that the semantic advisor version shall be semantic-advisor-v2, against the code Kibi reads at ingest.