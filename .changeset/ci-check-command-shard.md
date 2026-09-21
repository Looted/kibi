---
"kibi-cli": patch
---

Unit coverage can now run a single shard locally, and subprocess `check` tests no longer share the hanging CLI commands process.

`check.test.ts` was consuming the full 25-minute `cli.commands` bound under Bun 1.4 coverage with no further output. Those suites run in `cli.check-command`, sandbox `execSync`/`spawnSync` now time out after 60s by default, and `bun run test:coverage:unit -- --shards=cli.check-command` (or `KIBI_COVERAGE_SHARDS`) reproduces the CI coverage step without a full matrix.
