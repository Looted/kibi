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
   `.git` file. With the default hooks directory the output may state that it
   is shared with all worktrees.
3. Run `kibi init` from a repository subdirectory: `.kb/` must be created at
   the repository root only, and branch attachment must read the same
   recovery journals, legacy stores, and identity manifests as a root run —
   a blocked root run and a blocked subdirectory run must agree.
4. Pre-create a foreign pre-commit hook and run `kibi init`: the foreign file
   must remain byte-identical, the installer must report it as skipped with a
   per-hook integration recipe that reproduces the template's checks (both
   staged commands for pre-commit, `kibi sync` conditions for post hooks),
   and no unconditional success line may claim pre-commit enforcement.
5. Configure a relative `core.hooksPath` and run `kibi init`: hooks are
   installed for the current checkout only, the output must state that
   coverage of other worktrees is incomplete/unverified and point to the
   versioned-launcher recipe; the shared-directory claim must not appear.
6. Point `core.hooksPath` outside the repository: init must refuse to write
   hooks into unrelated directories.
7. Make a hook file a symlink (including a symlink whose target already
   contains a kibi-managed block, and a dangling symlink): init must leave
   both link and target untouched and report the skip.
8. Run `kibi init` inside a bare repository: it must refuse with exit 1 and
   create no `.kb/` workspace state.

Success: hooks are effective from every linked worktree, `kibi doctor` agrees
between primary checkout and worktree (and reflects a `core.hooksPath` change
on its next invocation), and foreign hooks, symlinks, and bare repositories
are refused with honest reporting.
