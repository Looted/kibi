---
title: Engine client dead Unix socket auto-reclaim and drain serialization
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - cli
  - engine
  - socket
fact_kind: subject
subject_key: kibi.engine.dead_socket_reclaim
origin:
  kind: agent
  recorded_at: '2026-11-23T10:46:56.058Z'
id: FACT-SUBJ-kibi-engine-dead-socket-reclaim
type: fact
---
Dead Unix socket probing, `startLockPath` serialization, fail-closed non-socket and permission handling, and drain wait in `packages/cli/src/engine.ts`, `packages/cli/src/commands/sync.ts`, and `packages/cli/src/commands/branch.ts`.