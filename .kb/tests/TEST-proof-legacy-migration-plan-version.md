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
    receipt_id: PR-cf317105e454246923ae1391
    test_id: TEST-proof-legacy-migration-plan-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 237ed7b8a48476ea769bfe62ae2d29c0c7a74ead9e8caa4e3a271672bffa3502
    binding_hash: 9c7dca1b7da971da1306d264bce9e8fb43ada7a735a532814bbdef6d7bec7b84
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