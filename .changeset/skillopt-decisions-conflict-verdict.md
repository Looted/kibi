---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The `kibi-decisions` skill now makes a conflict with a recorded rule the verdict of the answer, naming the rule and what it requires before asking the person anything. A stated rule counts as recorded only once its requirement, scenario and `implements` link have actually been written and `kb_check` is clean. After a `kb_compile_intent` plan is applied, the skill makes the new requirement firm with `origin.ref`, gives a must-priority requirement its `specified_by` scenario, and reruns `kb_check` until nothing is reported about it. In the 2026-10-22c SkillOpt campaign the mean rose from 71.33 to 89.5 and hard passes from 16 to 24 of 30. Compile-intent review went from 31.67 to 85.83. One closeout cell dropped from 100 to 90.
