---
title: Advice that impact diagnostics share is listed once
status: active
tags:
  - check
  - cost
origin:
  kind: agent
  recorded_at: '2026-11-24T19:19:35.141Z'
id: SCEN-kb-check-impact-advice-once
type: scenario
---
Given a change that produces several requirement_statement_unverified and symbol_semantic_review_needed diagnostics, when kb_check returns its structured result, then impactAdvice lists each shared advice once, each of those diagnostics carries advice, its index there, and no suggestion, and a diagnostic whose advice is its own keeps its suggestion.
