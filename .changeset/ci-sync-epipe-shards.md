---
"kibi-cli": patch
---

CI unit-coverage no longer hangs the shared commands shard on `sync.test.ts`, and Bun 1.4 live-socket write-EPIPE no longer fails the shared engine-remaining shard. Daemon socket refusal/serve coverage runs in its own isolate process.

- Isolate `sync.test.ts` into `cli.sync-command` coverage shard
- Move live/stale/daemon socket path tests into `cli.engine-live-socket` isolate
- Remap live-socket EPIPE by `code`/`errno` in the daemon probe
