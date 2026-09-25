---
id: TEST-git-hook-effective-install
title: Effective Git hooks path resolver, installer results, and init context regressions
status: passing
source: .kb/tests/TEST-git-hook-effective-install.md
links:
  - type: validates
    target: SCEN-git-hook-effective-install
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
