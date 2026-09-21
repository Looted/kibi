---
"kibi-cli": patch
---

Unit coverage isolates remaining sync command tests so they cannot hang the shared CLI commands shard.

Under Bun 1.4 with coverage, `sync-coverage` was timing out `git add` via `spawnSync` and then cascading 120s failures through migrate and check-remaining until the 25-minute process bound. Those files now run in their own `cli.sync-coverage` shard.
