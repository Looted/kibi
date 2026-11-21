---
title: Hook manager detection, printed manager configuration and doctor diagnosis
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-29T18:38:31.498Z'
id: TEST-git-hook-manager-integration
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-git-hook-manager-integration-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9f8603d3f5993b6564169caf
    test_id: TEST-git-hook-manager-integration
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 274c3e20d52f125c4fc5e8e45f6076336107a48da658e6140e7b1b8714727c85
    binding_hash: 27214a2a9caf25fffc866cfa704aad8ed7bb1c49da3719c384d50c85421fe72c
    fingerprint: c4b289555f3963c9af841c5de44a65c7751f292362b6a5a882d44e860bf0f936
    fingerprint_components:
      contract: 274c3e20d52f125c4fc5e8e45f6076336107a48da658e6140e7b1b8714727c85
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
      - symbol_id: SYM-git-hook-manager-integration-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `kibi init` and `kibi doctor` in real Git repositories set up for lefthook, husky and the pre-commit framework, checks that init writes no hooks and prints the manager configuration, executes the printed lefthook and pre-commit commands with a stand-in runner, and checks doctor's verdicts on the manager configuration (packages/cli/tests/commands/hook-managers.test.ts).