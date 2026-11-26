---
title: A skill that asks the person to confirm a rule they stated is rejected
status: active
expects: rejection
tags:
  - skills
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T11:44:18.960Z'
id: SCEN-NEG-kibi-skills-ask-only-for-decisions-SIGNOFF
type: scenario
---
Given a skill that tells the agent to confirm with the person every rule it records, or to ask before a step a Kibi result listed, the core-arc test rejects it: the person's stated words already approve the rule, and listed steps are the agent's to do.
