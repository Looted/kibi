---
title: A damaged bundled SWI-Prolog package is refused instead of run, even with a usable swipl on PATH
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T20:00:00.000Z'
id: SCEN-NEG-prolog-bundle-verification-CORRUPT-BUNDLE
type: scenario
---
Given an installed kibi-swipl platform package whose binary does not match the manifest checksum, or whose manifest is malformed, misses its version or home, or targets another platform, when Kibi resolves SWI-Prolog, then it fails with swipl_bundle_corrupt naming the damaged package and the reason, does not fall back silently to swipl on PATH, and tells the operator that KIBI_SWIPL=system selects the system install.

This is the failure side of bundled package verification. packages/cli/tests/prolog/swipl-resolver.test.ts "refuses a bundle with %s" exercises every damage case.
