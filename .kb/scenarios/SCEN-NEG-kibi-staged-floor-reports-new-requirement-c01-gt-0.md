---
title: Refused when commits refused for added requirement below floor is above 0
status: active
expects: rejection
text_ref: REQ-kibi-staged-floor-reports-new-requirement
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:20:30.135Z'
id: SCEN-NEG-kibi-staged-floor-reports-new-requirement-c01-gt-0
type: scenario
---
Given a project where commits refused for added requirement below floor is above 0, which REQ-kibi-staged-floor-reports-new-requirement forbids, then Kibi rejects that outcome, and TEST-kibi-staged-floor-reports-new-requirement fails if the code allows it.
