---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: passing
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - validation
links:
  - type: validates
    target: REQ-cli-check
  - type: validates
    target: SCEN-005
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-check
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b2ce0e452f8faf54bed64008
    test_id: TEST-004
    scope: end_to_end
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:06:06.692Z'
    finished_at: '2026-11-10T15:09:47.346Z'
    artifact_digest: 13c02300843459c2aba0610b516e4b77f6476f860bc62c8c5eef370eb72f2056
    contract_hash: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
    binding_hash: 377e6aa6c30aa6a89903100f52edd7b1b316a6d7caa5a42a5b04a4200830ab54
    fingerprint: 94f97b839d4a2976058c8c11d4fa4c3d46aa8c0bd29b39b461a0912b69609130
    fingerprint_components:
      contract: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
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
      - symbol_id: SYM-e2e-packed-cli-check
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
Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
