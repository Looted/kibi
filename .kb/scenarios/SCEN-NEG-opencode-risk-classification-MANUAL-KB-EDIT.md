---
title: A direct edit of an internal .kb file is classified manual_kb_edit, the maximum warning class
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:48.541Z'
id: SCEN-NEG-opencode-risk-classification-MANUAL-KB-EDIT
type: scenario
---
Given the packed OpenCode plugin, when an agent edits an opaque internal file under .kb rather than an entity document, then the edit is not treated as safe: it is classified manual_kb_edit, the class that carries the maximum warning, while a test-only edit stays safe_test_only.

This is the failure side of risk classification: a hand edit of Kibi's internal store must not pass unflagged as an ordinary documentation change. documentation/tests/e2e/packed/opencode-enforcement-surface.test.ts "classifies edit risk deterministically" exercises it.
