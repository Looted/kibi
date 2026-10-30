---
title: A source read of a member Kibi cannot read statically is refused with its place
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:02.549Z'
id: SCEN-NEG-kibi-source-proof-kinds-DYNAMIC-MEMBER
type: scenario
---
Given a TypeScript file that reads process.env through a computed variable name, when the references reader extracts the environment variables it reads, then the read is refused, not answered, and the reason names the file and line of the dynamic member.

This is the failure side of reading sources statically: a member Kibi cannot resolve must not be guessed into a certificate. packages/cli/tests/proofs/source-proof-kinds.test.ts "a reference Kibi cannot read statically refuses the read with its place" exercises it.
