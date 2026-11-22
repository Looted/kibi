---
title: Default engine janitor skipping current workspace dead sockets is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-22T15:54:17.173Z'
id: SCEN-NEG-cli-engine-janitor-workspace-sockets-SKIPPED
type: scenario
---
Given a dead daemon socket belonging to the current workspace, returning zero socket findings when `--all` is omitted fails the suite. Added for GitHub issue #829 (item 3, janitor half).
