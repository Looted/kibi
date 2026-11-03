---
title: Kibi sends refusals as rejected and keeps error for its own faults
status: active
priority: should
tags:
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T13:38:44.679Z'
id: SCEN-kibi-telemetry-expected-outcomes
type: scenario
---
Given telemetry is on
When an agent sends an upsert that Kibi refuses, such as an entity with an invalid status or a payload without a type
Then the operation's event is sent with status `rejected`, the refusal's fixed error category and the command's exit code
And the event holds no entity id, property value or workspace path.

Given telemetry is on
When a command or tool fails because Kibi itself broke
Then its event is sent with status `error` and, when the thrown error has a named class, that class name and never its message.

Given telemetry is on
When any operation finishes
Then its event carries `telemetry_version` 2, so charts can tell these events apart from older ones.