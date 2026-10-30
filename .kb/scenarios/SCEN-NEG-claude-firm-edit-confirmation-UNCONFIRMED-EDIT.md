---
title: An edit inside a firm requirement's symbol is held for the person instead of landing unasked
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:13.921Z'
id: SCEN-NEG-claude-firm-edit-confirmation-UNCONFIRMED-EDIT
type: scenario
---
Given a symbol that implements a current firm requirement, when the agent issues an Edit that changes it, then the kibi-claude PreToolUse hook does not let the edit through unasked: it answers with permissionDecision ask and a reason naming the symbol and the requirement.

This is the failure side of firm edit confirmation: an edit that would silently override a recorded firm decision is put to the person first. packages/claude/tests/hook-runner.test.ts "an edit inside a firm requirement's symbol is put to the person, with the requirement named to both" exercises it.
