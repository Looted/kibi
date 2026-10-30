---
title: Creating a requirement with a purely numeric ID returns an entity-id-style warning
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:01.681Z'
id: SCEN-NEG-kibi-entity-id-style-new-numeric-id
type: scenario
---
Given a packed CLI workspace, when an upsert creates a requirement whose ID is the purely numeric REQ-042, then the write is not accepted silently: its warnings include an entity-id-style finding for that ID, and a filename stem that differs from its frontmatter id is reported by the check as well.

This is the failure side of the ID style rule: numbered IDs say nothing about what they govern, so Kibi flags them where they are created. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "reports advisory redundancy, vocabulary, and naming findings and reuses subjects" exercises it.
