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
    receipt_id: PR-9875c256029f87b03d2ec8e7
    test_id: TEST-git-hook-manager-integration
    scope: end_to_end
    outcome: passed
    code_snapshot: d455aa725a28909e79a8e82ace487841327f0cf1e776d68257531ee6a02e3d39
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T18:41:53.972Z'
    finished_at: '2026-10-29T18:41:57.033Z'
    artifact_digest: 9402d707f4412c33ab1a52855aaccb95beee1a43a6649b64955fdc6a110ea80d
    contract_hash: 274c3e20d52f125c4fc5e8e45f6076336107a48da658e6140e7b1b8714727c85
    binding_hash: c3d3748497173e95c96113740d3b52e9784b9e8efa967dd78364bf9f99900bc1
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