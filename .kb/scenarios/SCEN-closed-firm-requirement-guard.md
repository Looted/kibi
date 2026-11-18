---
title: A closed firm requirement's code is guarded by the hooks and the commit gate
status: active
origin:
  kind: agent
  recorded_at: '2026-11-17T19:23:33.889Z'
id: SCEN-closed-firm-requirement-guard
type: scenario
---
A firm requirement is closed because it is done. An edit of its code gets the hook's ask, and kibi check --staged blocks it until a keeps receipt exists. A firm requirement closed because a current requirement supersedes it, and a superseded, retired, archived or removed requirement, guard nothing.
