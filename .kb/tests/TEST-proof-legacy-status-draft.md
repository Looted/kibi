---
title: A requirement marked draft shall be migrated as open, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-draft
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.draft
  proves:
    - CLAIM-36D64C508291EE50
origin:
  kind: agent
  recorded_at: '2026-10-29T10:41:33.799Z'
id: TEST-proof-legacy-status-draft
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8aa53e9cde6a8d48adffc90f
    test_id: TEST-proof-legacy-status-draft
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:45:00.428Z'
    finished_at: '2026-10-29T10:45:00.755Z'
    artifact_digest: 83c0a91645098daa56d7b1e5000aa58a0ac8efab65d2497db5f49aa5555f8528
    contract_hash: 23de206fc6f474782d7d175c3020b5419b6716bf6c29ef200a38a95ac708b44e
    binding_hash: c5998a4386f36116acfca574cae94576f2f11e6d34c85c609379ec1f668c5a3c
    fingerprint: 626060836ca473b2c62c31179b0a026fc5bf8c78f2e318a358443e77bb19f943
    fingerprint_components:
      contract: 23de206fc6f474782d7d175c3020b5419b6716bf6c29ef200a38a95ac708b44e
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
      - symbol_id: SYM-proof-legacy-status-draft
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
      test_id: TEST-proof-legacy-status-draft
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: open
    certificate_digest: e53f73d38be31fe28cd54e971a64113bd2ec4939e1ded6115029fc89cbdfd041
    claim_bindings:
      - claim_key: CLAIM-36D64C508291EE50
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-draft
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: open
---
Proves that a requirement marked draft shall be migrated as open, against the code Kibi reads at ingest.