---
title: The legacy migration plan version shall be kibi.legacy-migration-plan.v1, by a regex proof
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
    - symbol_id: SYM-proof-legacy-migration-plan-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-legacy-migration-plan-version
  proves:
    - CLAIM-EE1D765F437D4038
origin:
  kind: agent
  recorded_at: '2026-10-28T20:55:24.396Z'
id: TEST-proof-legacy-migration-plan-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1dd65478d2a379ef9a400d35
    test_id: TEST-proof-legacy-migration-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 45723d09ccc2f66812136995f1e9ff533e86cd9788676661b6338c4073cf1090
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:57:55.351Z'
    finished_at: '2026-10-28T20:57:55.510Z'
    artifact_digest: 47a32512ad7c60f4eb2f8c046e7785267c1b6e2f256a5a4f1162abda46e747d7
    contract_hash: 237ed7b8a48476ea769bfe62ae2d29c0c7a74ead9e8caa4e3a271672bffa3502
    binding_hash: 61ef3cc15a298b553c3fcf023e3b4bd36f8b297e02e48c275c4a1efa1a0fd5b9
    fingerprint: 7b6568a10d772b055d15be3d17ed4e745f12ef623daaa698ff4a98eefbeca269
    fingerprint_components:
      contract: 237ed7b8a48476ea769bfe62ae2d29c0c7a74ead9e8caa4e3a271672bffa3502
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
      - symbol_id: SYM-proof-legacy-migration-plan-version
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
      test_id: TEST-proof-legacy-migration-plan-version
      pattern:
        symbol_id: SYM-legacy-migration-plan-version
        type: string
        value: kibi.legacy-migration-plan.v1
    certificate_digest: cb0a12a69efcb32d12e8e84af6f722b49fbe490629e3cca2dfc391de7cac0f19
    claim_bindings:
      - claim_key: CLAIM-EE1D765F437D4038
        requirement_id: REQ-agent-migration-plan-versions
        fact_id: FACT-legacy-migration-plan-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.legacy-migration-plan.v1
---
Proves that the legacy migration plan version shall be kibi.legacy-migration-plan.v1, against the code Kibi reads at ingest.