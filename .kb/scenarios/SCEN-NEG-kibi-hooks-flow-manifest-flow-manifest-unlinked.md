---
title: A flow-layout symbol manifest is indexed and the edit hook does not call its linked file unlinked
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:36.648Z'
id: SCEN-NEG-kibi-hooks-flow-manifest-flow-manifest-unlinked
type: scenario
---
Given a consumer workspace whose symbols.yaml sequence is written in YAML flow layout, when the shipped edit hook runs for a linked source file, then the hook does not describe the file as unlinked but names its requirement, and a plain sync rewrites the manifest in block layout keeping its comments and symbol order.

This is the failure side of manifest reading: a layout difference must never make linked code look ungoverned to the agent editing it. packages/cli/tests/consumer/flow-manifest-hooks.test.ts "hooks still name the requirement and sync rewrites the manifest in block layout" exercises it.
