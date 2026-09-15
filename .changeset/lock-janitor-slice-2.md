---
"kibi-cli": minor
"kibi-core": minor
---

The lock stewardship loop closes. `kibi engine janitor` now sweeps stale engine artifacts: branch-store lock journals whose recorded holder is provably dead are cleaned (journal + rdf lock), a live daemon stranded by a removed worktree is stopped and cleaned, and — with `--all` — runtime-directory sockets left by dead daemons anywhere on the machine are removed. The command reports by default and executes with `--apply`, printing one line per finding (holder pid, workspace, holder state, action). `kibi status` now surfaces a `store_lock_stale` stale reason when the current workspace's branch store carries a dead-holder journal, so the state is visible before it wedges an operation.

This slice also completes the self-healing loop: the engine daemon's own attach path now performs the same classify-break-retry takeover as the CLI runtime, so a store locked by a crashed engine heals no matter which surface hits it first. Hardening from the code review: attach failures preserve the original error inside the structured context (a permissions problem is no longer re-branded as a lock with an unknown holder), the workspace watchdog requires two consecutive misses before stopping a daemon, and duplicated owner parsing/dead helpers were consolidated.

Technical summary: `prolog/janitor.ts` adds `sweepStoreLock`/`sweepWorkspaceStoreLocks`/`sweepRuntimeSockets`/`runJanitor` with journal classification via the shared boot-id-aware holder check; `engine.ts` wires `retryAttachAfterBreakingStaleLock` (moved from cli-runtime to `prolog/store-lock.ts`) into the daemon attach and hardens the watchdog; `kb.pl` preserves the original attach error in `kb_store_locked/3` and journals unconditionally with a boot-id read fallback; `discovery-executors.ts` surfaces the `store_lock_stale` stale reason; new `engine janitor` subcommand with report/apply modes and seven behavior tests.
