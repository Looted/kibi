---
title: An abstention is stated only in the text
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:39:01.171Z'
id: SCEN-NEG-kibi-search-next-step-ABSTENTION-ONLY-IN-TEXT
type: scenario
---
Given an abstained kb_search, when its structured result is read without the text, then it carries no note, so the advice to ask again in the knowledge base's words is lost.

The same test rejects it by asserting the note.