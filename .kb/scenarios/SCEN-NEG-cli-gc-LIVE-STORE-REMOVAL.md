---
title: kibi gc keeps live branch stores and removes nothing without --force
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:59:59.254Z'
id: SCEN-NEG-cli-gc-LIVE-STORE-REMOVAL
type: scenario
---
Given a repository with KB stores for develop, for a live branch feature/live and for a deleted branch feature/gone, when kibi gc runs without --force, then it only lists feature/gone as stale and removes nothing; when it runs with --force, then only the feature/gone store is quarantined and the develop and feature/live stores are kept.

This is the failure side of branch store garbage collection: a store whose git branch still exists, or any store during a preview, must never be removed. documentation/tests/e2e/packed/branch-store-recovery.test.ts "gc previews by default and quarantines only stores whose git branch is gone" exercises it.
