---
title: Native Linux CLI diagnostic controls preserve results and constrain metadata
status: passing
tags:
  - prolog
  - spike
  - linux
  - diagnostics
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-native-cli-suite-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-native-cli-suite-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-646e47a34f40726af9040d50
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: af1c0aa82e847471238800ef3cdc5d2a456848fd97696aa0fb876dbe93a93a39
    fingerprint: aadb6acc419c0b7fa8e363529e7954a2d5603e16e1df207e462e1fdce45d0229
    fingerprint_components:
      contract: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
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
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks that the diagnostics keep the command's output and exit code, and record no arguments or environment values.
