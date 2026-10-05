---
title: CLI env bootstrap precedence and attribution
status: passing
tags:
  - env
  - bootstrap
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-cli-env-bootstrap
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-cli-env-bootstrap

Executable coverage: `packages/cli/tests/env/bootstrap.test.ts`.

Asserts process/project/user/legacy precedence, blank-as-unset, `legacy_env` attribution, workspace env overrides, and that bootstrap diagnostics never serialize secret values.
