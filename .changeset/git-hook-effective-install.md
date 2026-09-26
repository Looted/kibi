---
"kibi-cli": patch
---

Git hooks now install and diagnose at the path Git actually executes, so Kibi
enforcement works from linked worktrees and repository subdirectories. Kibi
also refuses hook directories that escape through a symlink and reports skipped
hooks honestly, without implying that a hook was installed.

`kibi init` no longer assumes `.git` is a directory: it asks Git for the
effective hooks directory (`git rev-parse --git-path hooks`), so running init
inside a linked worktree installs into the repository-common hooks directory
(previously it crashed with `ENOTDIR`), and running init from a subdirectory
creates `.kb/` at the repository root instead of a stray nested copy. The
containment guard resolves real paths, including the nearest existing ancestor
when the final hooks directory does not exist, while allowing Git's default
common-directory layout. `kibi doctor` diagnoses the same effective directory,
so it no longer reports hooks as missing inside worktrees where they are
active, and it states the configured `core.hooksPath` when one redirects
enforcement. Hook installation reports per-hook outcomes; only installed and
updated hooks appear in the success summary, and an all-skipped run says that
no hooks were installed.

Technical summary: `resolveGitRepositoryContext` resolves worktree root, Git
dir, common dir, effective hooks dir, and config origin; real-path containment
also checks a missing directory's nearest existing ancestor; `installGitHooks`
returns per-hook outcomes; init derives `.kb`, gitignore, symbols manifest, and
hook targets from the resolved context; doctor checks that same directory.
