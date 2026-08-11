---
id: SCEN-kibi-telemetry-acceptance-gate
title: Gate completion on fresh workflow telemetry
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-telemetry-acceptance-gate.md
tags: [telemetry, acceptance, diagnostics, packed, e2e]
links:
  - type: verified_by
    target: TEST-kibi-telemetry-acceptance-gate
---

Given a packed Kibi installation and a fresh usage log with complete advisor, validation, lookup, proof, receipt, and retry evidence, when the operator requires telemetry acceptance, then the report passes and the command exits successfully. Given repeated unvalidated failures, stale or incomplete evidence, or stalled proof and receipt evidence, the gate exits nonzero while printing ranked repair evidence, and an unfiltered check exposes the same failures as non-blocking telemetry quality diagnostics.
