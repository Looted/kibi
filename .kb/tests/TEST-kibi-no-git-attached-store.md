---
title: 'Outside-Git consumer suite: one no-Git store across processes'
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:14.507Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-outside-git-consumer
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-attached-store
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6665d0c5bbbf377a62cfc345
    test_id: TEST-kibi-no-git-attached-store
    scope: end_to_end
    outcome: passed
    code_snapshot: b0855b47a95af799eb10e429c091c1ca706bc1832966a33e30d406e4dd1f5d52
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T12:12:47.022Z'
    finished_at: '2026-11-26T12:13:03.541Z'
    artifact_digest: 6a7847e69a847c0d5a3e6b9caebb3cdeba4275a47c6102f9f452afde1f85e2b3
    contract_hash: 5ac908dd415812d378260e6ef5557df013bf4341f01ca62a169c5a82ff997444
    binding_hash: f7ef20d7435a80715e1a0612c4c6d5bf06757cce6f1724b138f5894e797b2603
    fingerprint: d0c9d8122fcc37e17ca5d5867301d3cafa4c0411ba4393a026d9304827bab79f
    fingerprint_components:
      contract: 5ac908dd415812d378260e6ef5557df013bf4341f01ca62a169c5a82ff997444
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
      - symbol_id: SYM-test-kibi-outside-git-consumer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the built CLI in temporary directories outside Git (GIT_CEILING_DIRECTORIES above them) and checks that kibi init, kibi status, kibi upsert, kibi sync, kibi search and kibi check succeed on one store named kibi-internal/no-git, that KIBI_BRANCH names a store only for the processes that set it and cannot name the reserved namespace, and that Kibi works with Git missing from PATH (packages/cli/tests/consumer/outside-git.test.ts). Unit tests cover the workspace probe (packages/cli/tests/vcs/workspace-vcs.test.ts).
