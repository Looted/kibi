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
    receipt_id: PR-56148352090e6f4261453888
    test_id: TEST-kibi-no-git-attached-store
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:43:06.720Z'
    finished_at: '2026-11-25T11:43:24.093Z'
    artifact_digest: 945232d4ede55a42d15a26fd48a9a55509febdbaaf3f2a6a8193265ad31661ba
    contract_hash: 5ac908dd415812d378260e6ef5557df013bf4341f01ca62a169c5a82ff997444
    binding_hash: 1889b3930f6b28066bfb2b98696dc876b6ab25e2426af92226a0982cc7796700
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
