---
title: Signoff names the level and lists a level change and each lowered floor for the person
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T13:40:37.890Z'
id: SCEN-kibi-signoff-level
type: scenario
---
Given a change that sets kibi.level to remember and lowers a requirement's required_evidence from tested to asserted, when kibi signoff runs, then the view says Kibi level: remember (kibi.level in package.json, was test) and lists both under Decisions only you make; the questions view names the level too.
