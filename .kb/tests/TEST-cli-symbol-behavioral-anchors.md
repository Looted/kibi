---
id: TEST-cli-symbol-behavioral-anchors
title: CLI staged checks enforce behavioral symbol granularity
status: passing
created_at: 2026-06-06T00:00:00.000Z
updated_at: 2026-06-06T00:00:00.000Z
source: packages/cli/tests/commands/check-staged-enforcement.test.ts
tags:
  - cli
  - symbols
  - traceability
  - unit
links:
  - type: validates
    target: SCEN-symbol-behavioral-anchors
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-symbol-behavioral-anchors
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d23ff97390e49ce4112074aa
    test_id: TEST-cli-symbol-behavioral-anchors
    scope: end_to_end
    outcome: passed
    code_snapshot: f978b6e9b5fcce43bf3cbf2642f823bfa13a3389978b17ba625fe7b9e3299f1e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:11:12.447Z'
    finished_at: '2026-10-28T19:12:11.189Z'
    artifact_digest: 3e505f9d1194090cf0d64e10e52794bea573ee5f3ab22e001798fed8cb13f407
    contract_hash: a2fc25914c6d79afbfa88dfde772b1a78835b9d2685320319a1df69974984a1d
    binding_hash: 0d1315fdc1aae7204f80a75fc6b6aabc53f8df4f06ce211064bd26924670234c
    fingerprint: ec91f649101797464653cc8f2341a75f0bb0fcd259afbc69262f051508425456
    fingerprint_components:
      contract: a2fc25914c6d79afbfa88dfde772b1a78835b9d2685320319a1df69974984a1d
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
      - symbol_id: SYM-e2e-test-cli-symbol-behavioral-anchors
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
Verifies that staged symbol granularity diagnostics reject coarse links only when narrower behavioral symbols are available and ignore interface/type-only symbols as blockers.
