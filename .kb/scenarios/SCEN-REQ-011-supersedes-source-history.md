---
title: kb_upsert refuses a supersedes link that points from an older requirement to a newer one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T10:30:00.000Z'
id: SCEN-REQ-011-supersedes-source-history
type: scenario
---
Given two tracked requirement sources whose first Git additions are known, when a write records a supersedes link whose source entered history before its target, then kb_upsert refuses the changeset with RELATIONSHIP_VALIDATION_FAILED naming the reversed direction, and a link from the newer source to the older one is accepted.

Write governance validates relationship changesets against tracked history before they are committed. packages/cli/tests/operations-mutation/mutation/relationships.test.ts "validateSupersedesSourceHistory" exercises it, inside the TEST-cli-supersedes-history-unit proof run.
