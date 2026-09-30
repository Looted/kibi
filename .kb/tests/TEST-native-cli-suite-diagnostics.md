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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-49fb5561df8483ca2b72c213
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 9d8c969a1036b5252bf5402afb67f30d32751cc3899cb5fcbb9ac8bcf1f314c9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T15:16:48.592Z'
    finished_at: '2026-09-30T15:16:52.788Z'
    artifact_digest: 8c1cfdf132650522309914a83cfbba5ad49ef7977406eea702bd12a1235c46af
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: e5bc628f2978342418aed7bd332a8d5318c3043a5d9d5ab29f53173919193933
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
---
