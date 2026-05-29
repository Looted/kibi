---
id: SCEN-cli-usage-metrics-v1
title: CLI reports usage metrics from diagnostic logs
type: scenario
status: active
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
source: packages/cli/tests/commands/usage-metrics.test.ts
tags: [cli, usage-metrics]
links:
  - type: verified_by
    target: TEST-cli-usage-metrics-v1
---

When diagnostic usage logs exist, the CLI usage metrics command reads them and prints summarized usage information without mutating the KB.
