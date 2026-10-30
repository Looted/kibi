---
title: A UI component owned only by a non-design requirement is reported by the design policy
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:52.324Z'
id: SCEN-NEG-ui-plugin-design-policy-NON-DESIGN-OWNER
type: scenario
---
Given a component symbol that implements only a requirement without UI design predicates, when the check policies run, then the ui-component-ownership rule reports one finding for that symbol and its source file.

This is the failure side of the design policy: a component cannot satisfy design ownership through an unrelated requirement. packages/cli/tests/public/check-policy-rules.test.ts "a component owned only by a non-design requirement is reported" exercises it.
