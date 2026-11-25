---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-antigravity": patch
"kibi-opencode": patch
"kibi-vibe": patch
---

Kibi now works in a directory that is not inside a Git repository. Before, `kibi init` there failed with a long diagnostic that led with `KIBI_BRANCH`, and following it left every later command failing again. Now `kibi init` sets up the workspace, and search, query, record, upsert, check and sync work on one knowledge store for the directory, reading every `.kb` file on disk as input.

Kibi says what is missing instead of failing: `kibi init`, `kibi doctor`, the agent hosts' session start, `kibi status`, `kibi check` and the first MCP result of a session carry a `no_git_repository` advisory that names what is off (the commit gate, Git hooks, impact review and per-branch knowledge) and recommends `git init`, then `kibi init`. The agent instructions and the session brief say to finish each change with `kibi check`. The features that need Git (`kibi check --staged`, `kibi check-generated --staged`, `kibi check-diff`, `kibi hooks install`, `kibi branch ensure` / `migrate`, `kibi gc`, impact review, `kibi signoff`) refuse with the new code `GIT_REQUIRED` and name the Git-free alternative.

After `git init`, the first Kibi call carries the knowledge over to the new branch (pending-source receipts bind the untracked `.kb` files) and keeps the old store under `.kb/recovery/no-git-adoption/`. A `.git` entry that Git cannot read is still a failure, now coded `GIT_REPOSITORY_UNREADABLE`, so knowledge is never split from the branch it belongs to. The error reference has a "Working without Git" entry, and usage telemetry records whether a workspace has version control (`vcs`, `vcs_reason`), never a path.

Technical summary: `kibi-agent-core` adds `version-control` (`findRepositoryMarker`, `noGitAdvisory`, `noGitAdoptionNotice`, `NO_GIT_UNAVAILABLE_FEATURES`) and `checkoutSessionNote` / `workspaceTelemetryVcs` in `checkout-hooks`, which every host's session start now uses. The branch resolver attaches the reserved store `kibi-internal/no-git` (refused as a `KIBI_BRANCH` value) when the workspace probe finds no repository. `kibi-cli` adds `vcs/` (workspace probe, source inventory, Git boundary, adoption, advisory) and the `GitRequired` operation error, re-exported through `kibi-runtime`. `NOT_A_GIT_REPO` is replaced by `GIT_REPOSITORY_UNREADABLE`.
