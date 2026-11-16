---
title: Kibi migrate lists one quantity stated twice as a review action
status: active
priority: must
expects: success
tags:
  - check
  - quantity-duplicate
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:05.397Z'
id: SCEN-migrate-quantity-duplicate-review
type: scenario
---
On a KB at schema 18 with one pair, kibi migrate --dry-run notes that schema 19 blocks it with 1 pair found, the JSON plan holds a quantity_duplicate_review action naming both facts, and no fact is changed.