---
id: TEST-git-hook-effective-install
title: Effective Git hooks path resolver, installer results, and init context regressions
status: passing
links:
  - type: validates
    target: SCEN-git-hook-effective-install
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-git-hook-effective-install-init-context-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-installer-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-doctor-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a355997dd3ed0efdf8385f39
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 61057c7cf1c0e4f7b41f6a10eb8401783d829d6dd77415626b66eeeb9f257940
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:40:58.948Z'
    finished_at: '2026-10-28T22:41:10.493Z'
    artifact_digest: 0fcafd8316d1ab4dd4a2b528e4d5b3c9300dbe2d91bfde6edccc07525ceb021e
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: f5aefba58d7698229fa6d4411c45d590bebefbfffae14927c4269d7d6c5cef84
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
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

Real-git regression coverage for effective hooks path handling:

- `packages/cli/tests/utils/git-repository-context.test.ts` — resolver unit
  cases with isolated fixture git config: normal repository, subdirectory,
  linked worktree (common hooks dir + validated primary root), bare
  repository reported unsupported, worktree of a bare repository (primary
  null), configured `core.hooksPath` with origin, config change visibility,
  and spaces in paths.
- `packages/cli/tests/commands/init-git-context.test.ts` — init inside a
  linked worktree (hooks in the common dir, worktree-local `.kb`), init from
  a subdirectory (no nested `.kb/`), root/subdirectory agreement for blocked
  branch attachments (unfinished journal, corrupted journal, legacy store,
  legacy+hashed conflict, identity-manifest mismatch), foreign-hook skip
  reporting with per-hook integration recipes, configured `core.hooksPath`
  installation, outside-repository hooksPath refusal, coverage-limitation
  messaging for relative hooks paths in worktrees, and bare-repository
  refusal.
- `packages/cli/tests/commands/install-hook-safety.test.ts` — symlinked hook
  files are never edited through their target (external plain hook, external
  kibi-managed block, dangling symlink, directory symlink); regular managed
  hooks stay idempotently updatable.
- `packages/cli/tests/commands/doctor-git-context.test.ts` — doctor verdicts
  agree from root/subdirectory/linked worktree, a `core.hooksPath` change is
  visible on the next in-process invocation, and configuration stays visible
  in missing-hook diagnostics.
- `packages/cli/tests/commands/init-coverage.test.ts` — updated installer
  success message assertions.

These tests spawn real `git` and the built CLI; they run in the CLI package
suite.
