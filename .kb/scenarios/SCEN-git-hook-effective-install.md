---
id: SCEN-git-hook-effective-install
title: Hooks install and diagnose correctly from worktrees, subdirectories, and configured hooks paths
status: active
source: .kb/scenarios/SCEN-git-hook-effective-install.md
---

Steps:

1. Initialize a repository with Kibi, then create a linked worktree with
   `git worktree add`.
2. Run `kibi init` inside the linked worktree: it must exit 0, write the
   worktree's own `.kb/` workspace state, and install hooks into the
   repository-common hooks directory instead of failing with `ENOTDIR` on the
   `.git` file.
3. Run `kibi init` from a repository subdirectory: `.kb/` must be created at
   the repository root only, and hooks must still be installed.
4. Pre-create a foreign pre-commit hook and run `kibi init`: the foreign file
   must remain byte-identical, the installer must report it as skipped, and no
   unconditional success line may claim pre-commit enforcement.
5. Configure `core.hooksPath` and run `kibi init` and `kibi doctor`: both must
   target and report the directory Git executes, including the config origin.

Success: hooks are effective from every linked worktree, `kibi doctor` agrees
between primary checkout and worktree, and foreign hooks are preserved with
honest reporting.
