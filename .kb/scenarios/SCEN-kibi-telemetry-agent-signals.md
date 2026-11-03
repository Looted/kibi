---
title: Telemetry shows which rule a refused upsert broke, retries, skill loads and how searches end
status: active
priority: should
tags:
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:39.782Z'
id: SCEN-kibi-telemetry-agent-signals
type: scenario
---
Given telemetry is on
When an agent sends an upsert whose status is not an allowed value, then sends the same entity again
Then the first event names the rule `enum` and the field `status` with attempt 1, and the second has attempt 2 after a `rejected` attempt.

Given telemetry is on
When an agent searches for words the KB does not contain, twice within two minutes
Then both events report result count 0 and an abstained search, and the second is marked as a repeated search.

Given a host hook saw a Kibi skill load in the workspace
When a CLI command or MCP tool runs there within 30 minutes
Then its event says a skill was loaded before.

Given telemetry is on
When Kibi itself fails
Then its event names the top stack frame inside Kibi's packages as package, module and function, with a fingerprint, and no path, line or message.