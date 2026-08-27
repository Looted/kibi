---
id: SCEN-kibi-telemetry-remediation-evidence
title: Correlate diagnostic evidence and repair exact unmatched events
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-telemetry-remediation-evidence.md
tags: [telemetry, diagnostics, remediation, cli, mcp, packed, e2e]
links:
  - type: verified_by
    target: TEST-kibi-telemetry-remediation-evidence
---

Given fresh packed CLI and MCP runtimes in diagnostic mode, when both receive the same opaque session and actor identifiers, then they append semantically equivalent correlated usage records. Given advisor or preflight evidence from a different session or actor, when the operator runs `usage-remediation`, then `kibi.telemetry-remediation.v1` identifies the exact unmatched upsert by log line and audit fields, orders repairs deterministically, preserves missing coverage as report-level work, and does not mutate the usage log or knowledge base.
