---
title: A SkillOpt candidate replaces the skill description and the target sees exactly it
status: active
tags:
  - skillopt
  - evaluation
expects: success
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: let SkillOpt optimize the skill description, not just the body'
  recorded_at: '2026-10-06T00:22:34.781Z'
id: SCEN-skillopt-description-candidates
type: scenario
---
Given an operator with a candidate body and a one-line candidate description for a Kibi skill
When campaign compose runs with --body-file and --description-file
Then a 1.2.0 manifest freezes the description and its hash with every other frontmatter field unchanged
And every target cell scored for that candidate reads the skill with that description and body
And a multi-line, over-long, angle-bracket or policy-violating description is refused
And a description without a replacement body is refused before any cell work
