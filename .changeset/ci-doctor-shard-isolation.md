---
"kibi-cli": patch
---

Unit coverage no longer lets doctor command tests poison the shared CLI commands shard.

Under Bun 1.4 with coverage, doctor SWI-Prolog checks could hang on a dangling engine and then make later `spawnSync(/bin/sh)` calls time out across the rest of `cli.commands`. Doctor suites now run in their own `cli.doctor` shard so commands coverage can finish and produce LCOV.
