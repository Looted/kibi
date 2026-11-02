---
title: A Prolog calls read that reaches a goal held in a variable is refused with its place
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-31T10:23:44.092Z'
id: SCEN-NEG-kibi-prolog-source-readers-DYNAMIC-GOAL
type: scenario
---
Given a SWI-Prolog module with run_plugin(Goal) :- call(Goal), when a source test reads the calls of the library's modules to decide that it never calls use_foreign_library/1, then the read is refused, not answered, and the reason names prolog/plugins.pl line 2 and call(Goal), so the claim is not decided over calls Kibi only partly saw.

This is the failure side of reading Prolog statically. documentation/tests/e2e/packed/prolog-source-readers.test.ts and packages/cli/tests/proofs/prolog-source-readers.test.ts exercise it.