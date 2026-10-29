---
title: kibi query refuses a type filter naming an entity type Kibi does not have
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:31.096Z'
id: SCEN-NEG-cli-query-UNKNOWN-TYPE-FILTER
type: scenario
---
Given a synced workspace, when kibi query is asked for the entity type widget, then it does not fall back to an empty or unfiltered listing: it exits non-zero with Invalid type 'widget' and lists the valid types req, scenario, test and the rest.

This is the failure side of query filtering: a filter outside the supported dimensions must be refused, not answered as if nothing matched. documentation/tests/e2e/packed/cli-workflows.test.ts "should reject a query filter naming an entity type Kibi does not have" exercises it.
