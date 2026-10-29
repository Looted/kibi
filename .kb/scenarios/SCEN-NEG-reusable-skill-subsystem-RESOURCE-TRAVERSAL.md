---
title: Reading a bundled skill resource outside its skill directory is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:35.867Z'
id: SCEN-NEG-reusable-skill-subsystem-RESOURCE-TRAVERSAL
type: scenario
---
Given a valid bundled skill, when a resource is requested as ../secret.txt, then the read is refused with an out-of-bounds error and no file outside the skill directory is surfaced.

This is the failure side of skill resource validation: a skill must not surface files beyond the resources it declares inside its own directory. packages/cli/tests/skills.test.ts "rejects resource path traversal" exercises it.
