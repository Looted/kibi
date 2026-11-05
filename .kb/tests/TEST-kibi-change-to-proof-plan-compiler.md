---
id: TEST-kibi-change-to-proof-plan-compiler
title: Change-to-proof plan compiler verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
priority: must
verification_scope: integration
verification_perspective: internal
tags:
  - planning
  - requirements
  - contradiction
  - traceability
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-plan-compiler
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7b6c89b5d0900cb11868ca74
    test_id: TEST-kibi-change-to-proof-plan-compiler
    scope: integration
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: ba37973ba7871aaa52259f9f2107821bb175c7f6fbd46f005fb563a15989c815
    binding_hash: 5f88acb7d0735cda3176d6aae34d802a08a9019f6158f9cea195396f79469429
    fingerprint: f631687ab3aad97adc1dc79db05698614287e6e65cafe1788b6fc3c8fdc47e39
    fingerprint_components:
      contract: ba37973ba7871aaa52259f9f2107821bb175c7f6fbd46f005fb563a15989c815
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
      - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.
