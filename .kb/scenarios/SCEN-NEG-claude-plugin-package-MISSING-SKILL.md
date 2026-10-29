---
title: A kibi-claude skills directory missing a bundled skill fails the skills check and is restored before pack
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:10:59.677Z'
id: SCEN-NEG-claude-plugin-package-MISSING-SKILL
type: scenario
---
Given a copy of the kibi-claude skills directory with the kibi-usage skill removed, when the agent skills sync runs in check mode for the claude mirror, then it reports the claude mirror as drifted and names kibi-usage/SKILL.md; and when the package build that prepack runs writes the mirror again, the skill is restored and the check passes.

This is the failure side of the bundled skills: a kibi-claude package that lost one of its six skills must not pass the check or be packed as it is. packages/claude/tests/distribution.test.ts "a kibi-claude skills directory missing a bundled skill fails the skills check, and the prepack build restores it" exercises it.
