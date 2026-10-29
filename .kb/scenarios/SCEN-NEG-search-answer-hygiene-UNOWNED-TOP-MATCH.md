---
title: A search answer whose top match no requirement owns names it instead of passing lower hits off as its requirement
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:58:28.985Z'
id: SCEN-NEG-search-answer-hygiene-UNOWNED-TOP-MATCH
type: scenario
---
Given a search whose top-ranked match is a fact linked to no requirement and whose lower match reaches a requirement, when the answer is built, then the fact is listed as ungoverned with its rank and the note says the governing requirements came only from lower-ranked matches.

This is the failure side of search answer hygiene: an unowned top match must not be presented as governed by a requirement it is not linked to. packages/cli/tests/search-answer.test.ts "a top-ranked fact no requirement owns is named instead of passing lower hits off as its requirement" exercises it.
