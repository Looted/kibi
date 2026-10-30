---
title: A restates link whose target is not a requirement is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:11:05.149Z'
id: SCEN-NEG-kibi-restates-relationship-RESTATES-NON-REQUIREMENT
type: scenario
---
Given a synced KB with a session lifetime requirement and a strict fact, when kibi upsert adds a restates link from the requirement to the fact, then the write exits with an error saying restates from req to fact is an invalid relationship and nothing is linked.

This is the failure side of the restates relationship: restates may only join two requirements, so it cannot be used to tie a requirement to any other entity. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "rejects a restates link whose target is not a requirement" exercises it.
