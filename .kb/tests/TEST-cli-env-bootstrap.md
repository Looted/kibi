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
---
# TEST-cli-env-bootstrap

Executable coverage: `packages/cli/tests/env/bootstrap.test.ts`.

Asserts process/project/user/legacy precedence, blank-as-unset, `legacy_env` attribution, workspace env overrides, and that bootstrap diagnostics never serialize secret values.
