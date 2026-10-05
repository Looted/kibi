---
id: TEST-cli-config-schema
title: CLI config and schema version unit tests
status: active
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/utils/config.test.ts
tags:
  - cli
  - config
  - schema
  - unit
links:
  - type: validates
    target: SCEN-cli-config-schema-v1
verification_scope: unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Verifies CLI config parsing and schema-version helper behavior used by migration and validation workflows.
