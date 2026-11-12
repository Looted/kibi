---
title: A staged function whose only link is an implements comment is rejected
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - traceability
  - staged-check
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T06:01:47.289Z'
id: SCEN-NEG-traceability-comment-only-link
type: scenario
---
Given a staged requirement and a staged function whose only link to it is an `implements` comment directly above the declaration, with no symbol manifest entry, when `kibi check --staged` runs, then it exits 1, names the function with 0 of 1 links and says that a code comment is never a link.

This is the failure side of manifest-only links: counting the comment would let the commit pass. `documentation/tests/e2e/packed/inline-implements-comments.test.ts` exercises it against the packed CLI.
