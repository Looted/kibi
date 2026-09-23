---
title: Doctor env bootstrap diagnostics without plugin import
status: passing
tags:
  - env
  - bootstrap
  - doctor
verification_scope: unit
verification_perspective: internal
id: TEST-cli-doctor-env-bootstrap
type: test
---
# TEST-cli-doctor-env-bootstrap

Executable coverage: `packages/cli/tests/commands/doctor-behavior.test.ts` (capability plugins suite).

Asserts import-free doctor diagnostics, bootstrap source labels including process-over-project and `legacy_env`, `KIBI_WORKSPACE` package.json resolution, and that secret values never appear in doctor JSON.
