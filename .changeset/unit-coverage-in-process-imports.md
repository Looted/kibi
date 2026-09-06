---
"kibi-cli": patch
---

Developers and CI now measure line coverage for CLI commands that used to
look untested because the suite only spawned the `kibi` binary. The daemon
entry is the same program; tests can call it without going through
`process.argv`. Coverage numbers reflect those modules instead of silently
omitting them.

- Export `runEngineDaemonCli` from `engine-daemon.ts` and add in-process command tests.
