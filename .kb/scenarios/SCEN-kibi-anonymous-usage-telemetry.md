---
title: Kibi sends anonymous summary events by default and stops when the user opts out
status: active
priority: should
tags:
  - telemetry
  - privacy
origin:
  kind: agent
  recorded_at: '2026-10-29T09:37:21.818Z'
id: SCEN-kibi-anonymous-usage-telemetry
type: scenario
---
Given a Kibi install outside CI and test runners with no telemetry setting
When the agent runs MCP tools and CLI commands and the Claude Code hooks react to reads and edits
Then each tool call, command and hook decision queues one anonymous summary event with its fixed operation or action name, status, duration, error category, versions, platform, a random install id and a hashed session id
And the first run prints a one-time notice that names `kibi telemetry disable` and `KIBI_TELEMETRY=0`
And the queue is sent to the Kibi PostHog project in batches, with no file path, query, entity id, KB content, error message or repository name in any event.

Given the user ran `kibi telemetry disable`, or set `KIBI_TELEMETRY=0` or `DO_NOT_TRACK=1`, or runs in CI or under a test runner without `KIBI_TELEMETRY=1`
When the same work happens
Then no event is queued or sent, and queued events are deleted on disable.

Given the network is down or PostHog answers with a server error
When a batch is sent
Then the events stay queued for the next attempt and the command's output and exit code are unchanged.