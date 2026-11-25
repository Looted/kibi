---
title: Kibi works in a workspace without a Git repository
status: accepted
tags:
  - branching
  - vcs
  - init
  - diagnostics
origin:
  kind: agent
  ref: 'Records the design the maintainer asked for on 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:08:19.516Z'
  approved_by: maintainer
id: ADR-kibi-workspaces-without-git
type: adr
---
# ADR: Kibi works in a workspace without a Git repository

## Context

ADR-012 made a workspace outside any Git repository a diagnostic failure: Kibi keeps its knowledge per Git branch, and without a branch every operation refused. In practice agents set Kibi up in directories before `git init`. From 2026-11-15 to 2026-11-25, 5 of the 9 installations that ran `kibi init` had it fail there, on Windows, macOS and Linux. The only way through was `KIBI_BRANCH`, which nothing in `.kb/` remembers, so every later command failed again, and even with it `kibi sync` read sources through `git ls-files` and left the store stale.

The maintainer does not want Kibi refused outside Git: without Git the flow is simpler and the commit gate does not work, but the MCP tools and hooks can still be used, so Kibi should advise using Git and not block its use.

## Decision

1. **One store for a workspace without Git.** When `KIBI_BRANCH` is unset and the workspace is outside any Git repository (Git reports no repository, or Git is not installed, and no `.git` entry exists at or above the workspace root), every operation attaches the reserved store `kibi-internal/no-git`. It is not a branch and not a default branch: it is never selected where a `.git` entry exists, and the `kibi-internal/` namespace cannot be named through `KIBI_BRANCH`.
2. **Detection is conservative.** A `.git` entry that Git cannot read (ownership, permissions, a broken `.git` file) is never treated as "no repository": the operation fails with `GIT_REPOSITORY_UNREADABLE`, so knowledge is never split from the branch it belongs to.
3. **Authored input without Git is what is on disk.** Outside a repository nothing but presence vouches for bytes, so every authored `.kb` source on disk is compiler input and no pending-source receipt is written or required. Inside a repository input stays what Git tracks plus receipts. The source inventory asks Git first and classifies the workspace only when Git fails, so a repository pays nothing extra.
4. **Advise, do not block.** `kibi init`, `kibi doctor`, the host session start, `kibi status`, `kibi check` and the first MCP result of a session carry the `no_git_repository` advisory (a warning): what is off until there is a repository (the commit gate, Git hooks, impact review, per-branch knowledge) and `git init`, then `kibi init`. Agent instructions and the session brief say to finish each change with `kibi check`.
5. **Features that read Git refuse with `GIT_REQUIRED`.** The commit gate, `kibi check-generated --staged`, `kibi check-diff`, `kibi hooks install`, `kibi branch ensure` and `migrate`, `kibi gc`, impact review and `kibi signoff` fail with the coded, non-retryable `GIT_REQUIRED`, naming the Git-free command to run instead. A refusal keeps the missing gate visible; running a different check in its place would hide it.
6. **`git init` carries the knowledge over.** The first operation on the new branch, when that branch has no store and a no-Git store exists, writes pending-source receipts binding every untracked authored source on disk to the branch, keeps the no-Git store under `.kb/recovery/no-git-adoption/` with a journal, and reports the adoption once (`no_git_store_adopted`). Nothing is deleted and no store is moved between identities.

## Consequences

- Kibi can be set up and used before a repository exists; adopting Git later loses nothing.
- Without Git there is one store and no commit gate. Kibi says so on every surface where it matters instead of failing.
- Usage telemetry records whether a workspace has version control (`vcs`, `vcs_reason`), never a path, and counts `GIT_REQUIRED` and `GIT_REPOSITORY_UNREADABLE` as rejections.
- ADR-012 is amended: its precedence gains the no-Git store, and its non-Git failure rule is replaced.
