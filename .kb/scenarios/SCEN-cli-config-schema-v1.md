---
id: SCEN-cli-config-schema-v1
title: CLI config schema version helpers expose the current KB schema version
type: scenario
status: active
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/utils/config.test.ts
tags:
  - cli
  - config
  - schema
links:
  - type: verified_by
    target: TEST-cli-config-schema
  - type: verified_by
    target: TEST-e2e-schema-version-surface
---

Configuration helpers report the current KB schema version and keep migration/config validation behavior aligned with write-governance expectations.
