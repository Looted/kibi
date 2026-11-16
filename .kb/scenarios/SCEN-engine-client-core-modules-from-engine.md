---
title: Two installs of one release share an engine and both clients can run checks
status: active
priority: must
expects: success
tags:
  - engine
  - daemon
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:24.940Z'
id: SCEN-engine-client-core-modules-from-engine
type: scenario
---
Given a project-local Kibi install and a second install of the same release with the same SWI-Prolog, when the first starts the engine daemon for a workspace and the second runs kibi check or an MCP kb_check against it, then the second client's module loads resolve to the core the daemon runs, the daemon keeps serving both, and the check returns its findings.