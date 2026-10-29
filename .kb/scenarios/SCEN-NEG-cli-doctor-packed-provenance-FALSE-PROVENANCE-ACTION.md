---
title: Doctor on a packed consumer whose kibi-mcp hides package.json emits no false package-provenance-unresolved action
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:58:06.480Z'
id: SCEN-NEG-cli-doctor-packed-provenance-FALSE-PROVENANCE-ACTION
type: scenario
---
Given an npm or pnpm consumer that installed the packed Kibi tarballs, where kibi-mcp does not export its ./package.json subpath, when kibi doctor --format json runs there, then it still reports the installed kibi-core and kibi-mcp versions and manifest locations and refuses to emit the package-provenance-unresolved migration action.

This is the failure side of packed provenance: a tight exports map must not be mistaken for a package missing from the install graph. documentation/tests/e2e/packed/release-package-contract.test.ts "packs compiled CLI/core/MCP artifacts and resolves an npm consumer locally" exercises it through verifyDoctorProvenance.
