---
title: Generate and publish a complete requirement health report
status: active
tags:
  - cli
  - report
  - html
  - ci
id: SCEN-kibi-html-health-report
type: scenario
---
Given a synced Kibi project with requirement and symbol coverage
When an operator generates the requirement-health report
Then one self-contained HTML file shows complete proof metrics and per-requirement stages
And unsafe knowledge text is escaped
And the output can be opened locally or published as a static CI artifact
And incomplete pagination cannot be presented as complete health.