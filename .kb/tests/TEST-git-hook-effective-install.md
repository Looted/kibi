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
  cases: normal repository, subdirectory, linked worktree (common hooks dir +
  primary root), configured `core.hooksPath` with origin, bare repository
  rejection, and spaces in paths.
- `packages/cli/tests/commands/init-git-context.test.ts` — init inside a
  linked worktree (hooks in the common dir, worktree-local `.kb/`), init from
  a subdirectory (no nested `.kb/`), foreign-hook skip reporting, and
  configured `core.hooksPath` installation.
- `packages/cli/tests/commands/init-coverage.test.ts` — updated installer
  success message assertions.

These tests spawn real `git` and the built CLI; they run in the CLI package
suite.
