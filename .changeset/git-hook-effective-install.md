---
"kibi-cli": patch
---

Git hooks now install and diagnose at the path Git actually executes, so Kibi
enforcement works from linked worktrees and subdirectories instead of silently
missing or crashing.

`kibi init` no longer assumes `.git` is a directory: it asks Git for the
effective hooks directory (`git rev-parse --git-path hooks`), so running init
inside a linked worktree installs into the repository-common hooks directory
(previously it crashed with `ENOTDIR`), and running init from a subdirectory
creates `.kb/` at the repository root instead of a stray nested copy.
`kibi doctor` diagnoses the same effective directory, so it no longer reports
hooks as missing inside worktrees where they are active, and it states the
configured `core.hooksPath` when one redirects enforcement. Hook installation
now reports a per-hook result and preserves foreign hooks without claiming
success for them.

Technical summary: new `resolveGitRepositoryContext` util (worktree root, git
dir, common dir, effective hooks dir, config origin, git ≥ 2.31
`--path-format=absolute` with relative fallback); `installGitHooks` takes the
resolved hooks directory and returns per-hook results (`installed`, `updated`,
`skipped-foreign`); init derives `.kb`, gitignore, symbols manifest, and hook
targets from the resolved context; doctor hook checks read the resolved
directory.
