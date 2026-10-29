---
title: After kibi telemetry disable or KIBI_TELEMETRY=0, a command records and sends no telemetry
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:29.306Z'
id: SCEN-NEG-kibi-anonymous-usage-telemetry-opted-out-send
type: scenario
---
Given a user who ran `kibi telemetry disable`, or who sets KIBI_TELEMETRY=0, when a Kibi CLI command runs against a local telemetry host, then Kibi refuses to record or send a usage event and the host receives nothing.

This is the failure side of opt-out telemetry: once someone opts out, no command may report usage on their behalf. packages/cli/tests/usage-telemetry-e2e.test.ts "kibi telemetry disable and KIBI_TELEMETRY=0 stop recording and sending" exercises it.
