---
title: SkillOpt harness child processes
status: active
fact_kind: subject
subject_key: kibi.skillopt.harness_child_processes
tags:
  - strict-lane
  - skillopt
origin:
  kind: agent
  recorded_at: '2026-11-13T10:00:00.000Z'
id: FACT-subject-skillopt-harness-child-processes
type: fact
---
The processes the SkillOpt evaluation harness starts: fixture setup and scoring runs of the Kibi CLI installed in a fixture, and every child started through the harness's bounded process runner. It is not the target agent's own host process.