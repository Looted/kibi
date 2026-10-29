---
title: Strict enforcement requested for a non-authoritative posture is held to advisory
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:16.006Z'
id: SCEN-NEG-opencode-smart-enforcement-v1-STRICT-ON-VENDORED
type: scenario
---
Given an OpenCode configuration that asks for strict mode with requireRootKbForStrict, when the workspace posture is vendored_only, then the packed plugin refuses strict enforcement and resolves the effective mode to advisory, while an authoritative root_active posture still earns strict.

This is the failure side of posture-aware enforcement: strict blocking must not be applied where the root knowledge base is not authoritative. documentation/tests/e2e/packed/opencode-enforcement-surface.test.ts "resolves the effective enforcement mode from posture and maintenance" exercises it.
