---
title: A vendored Kibi tree is not taken for an initialized root workspace
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:38.325Z'
id: SCEN-NEG-opencode-posture-detection-VENDORED-TREE
type: scenario
---
Given a workspace whose only .kb directory sits inside a vendored kibi tree, and another with no Kibi installation, when the packed OpenCode plugin detects posture, then the vendored workspace is classified vendored_only rather than an authoritative root posture, and the empty one root_uninitialized with needsBootstrap set.

This is the failure side of posture detection: a vendored copy of Kibi must not earn the enforcement of an initialized root workspace. documentation/tests/e2e/packed/opencode-enforcement-surface.test.ts "detects repository posture states" exercises it.
