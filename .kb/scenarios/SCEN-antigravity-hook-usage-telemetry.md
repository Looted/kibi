---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:04:03.896Z'
status: active
tags:
  - scenario
  - antigravity
  - telemetry
title: Antigravity hooks log diagnostic usage telemetry only when KIBI_DIAGNOSTIC_MODE is enabled
id: SCEN-antigravity-hook-usage-telemetry
type: scenario
expects: success
---
# Opt-in diagnostic hook usage telemetry for Antigravity

- **Given** a conversation in an opted-in Kibi workspace
- **When** `KIBI_DIAGNOSTIC_MODE=1` is set and Antigravity hooks run
- **Then** `appendHookUsage` writes host `"antigravity"` rows to `.kb/usage.log` through the shared `kibi-agent-core` recorder and `flushHookTelemetry` flushes pending writes
- **And** when `KIBI_DIAGNOSTIC_MODE` is unset or disabled, no `.kb/usage.log` rows are written
