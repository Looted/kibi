---
title: A candidate description supplied without a candidate body is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:36.117Z'
id: SCEN-NEG-skillopt-description-candidates-ORPHAN-DESCRIPTION
type: scenario
---
Given a description file but no body file, when the operator composes a SkillOpt candidate, then the campaign refuses it with exit 2; a multi-line description supplied with a body is refused as well.

This is the failure side of description candidates: a description cannot be optimised apart from the body it describes. documentation/tests/e2e/skillopt-description-candidates.e2e.ts, in its second part where unsafe or orphaned descriptions are refused, exercises it.
