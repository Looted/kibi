---
title: A Prolog domain read of a predicate with several arguments and no arg is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-31T08:37:35.161Z'
id: SCEN-NEG-kibi-multilingual-code-proofs-AMBIGUOUS-PROJECTION
type: scenario
---
Given a SWI-Prolog file defining operator/2 facts, when a proof contract reads operator/2 as an exhaustive domain without naming which argument holds the members, then the read is refused, not answered, and the reason asks the contract to set arg. A predicate whose solutions leave the argument unbound is refused the same way.

This is the failure side of reading Prolog domains: Kibi must not guess which argument a certificate is about. packages/cli/tests/proofs/prolog-code-proofs.test.ts "refuses an ambiguous projection, an unbound solution and a missing predicate" exercises it.