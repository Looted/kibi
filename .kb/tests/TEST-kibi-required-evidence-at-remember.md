---
title: 'Required evidence at level remember: floors are reported, and raising one is refused'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-required-evidence-at-remember
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:42.985Z'
id: TEST-kibi-required-evidence-at-remember
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7b84db410dbc5555dcdc6623
    test_id: TEST-kibi-required-evidence-at-remember
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:21:57.204Z'
    finished_at: '2026-11-25T10:21:57.358Z'
    artifact_digest: 769b3073968f75bf1234cc2dcbcc94c3df4968eff30ad84e5d61491c01feb530
    contract_hash: 26b969736a75d12d91117e7bcb25f8b4c58f51133708bba64567acb20e669d71
    binding_hash: cf9bbeae57194d5d68126aedcc2bcafe7890841fd6a80fd8b765adf6917c2781
    fingerprint: d4b03dfea25250824f017f450ff58f093e4e9d8f983d8cb93ed55c4e9490f50d
    fingerprint_components:
      contract: 26b969736a75d12d91117e7bcb25f8b4c58f51133708bba64567acb20e669d71
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
      - symbol_id: SYM-test-kibi-required-evidence-at-remember
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/required-evidence-at-remember.test.ts`. It checks that the rule is a non-blocking knowledge rule every level runs, that at remember each current requirement with a tested or proved floor is reported naming the level while retired, superseded and lower floors are not, that nothing is reported at test, and that kb_upsert refuses a write raising the floor at remember but not one that keeps or lowers it, nor any write at test.
