---
title: Kibi refuses a KB dependency it cannot read as pinned
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-04T10:42:07.480Z'
id: SCEN-NEG-kb-dependencies-git-refused
type: scenario
---
Given a `kb` argument that names no declared dependency, a dependency whose lock entry is missing or no longer matches its declaration, a ref `kibi deps lock` cannot resolve, a pinned commit that has no `.kb` directory, or a dependency on a KB schema older than 6 or newer than the running Kibi reads, when a read names that dependency or `kibi deps lock` runs, then Kibi rejects it with a coded error (`DEPENDENCY_UNKNOWN`, `DEPENDENCY_NOT_LOCKED`, `DEPENDENCY_LOCK_STALE`, `DEPENDENCY_REF_NOT_FOUND`, `DEPENDENCY_NOT_A_KB` or `DEPENDENCY_SCHEMA_UNSUPPORTED`) instead of answering from another commit or from the project's own KB.

This is the failure side of KB dependencies. packages/cli/tests/dependencies/kb-dependencies.test.ts and packages/cli/tests/dependencies/kb-dependency-commands.test.ts exercise each code.