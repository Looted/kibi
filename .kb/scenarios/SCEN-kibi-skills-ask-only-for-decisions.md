---
title: The skills name what needs the person and let the agent do the rest
status: active
expects: success
tags:
  - skills
  - agent-guidance
origin:
  kind: agent
  recorded_at: '2026-11-26T11:44:17.324Z'
id: SCEN-kibi-skills-ask-only-for-decisions
type: scenario
---
Given the bundled kibi-usage and kibi-decisions skills, when an agent reads them, then they tell it to ask the person only for a decision (a conflict with a recorded rule, a choice between behaviours, an exception, wording that says more or less than the person's), to do the steps a Kibi result lists without asking, and that a rule the person stated is approved by their own words, so its wording is not put back to them.
