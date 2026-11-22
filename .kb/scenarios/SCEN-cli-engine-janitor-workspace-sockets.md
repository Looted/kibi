---
title: Default engine janitor sweeps current workspace dead sockets and leaves other workspaces untouched
status: active
priority: should
expects: success
tags:
  - cli
  - engine
  - janitor
origin:
  kind: agent
  recorded_at: '2026-11-22T15:54:15.998Z'
id: SCEN-cli-engine-janitor-workspace-sockets
type: scenario
---
Given a runtime directory containing a dead daemon socket for the current workspace and a dead daemon socket for another workspace, when `kibi engine janitor` runs without `--all`, it reports the current workspace dead socket as cleanable, removes it with `--apply`, and leaves the other workspace socket untouched. Requested in GitHub issue #829 (item 3, janitor half).
