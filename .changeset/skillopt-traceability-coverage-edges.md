---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The `kibi-traceability` skill now explains which edge belongs on which symbol when linking coverage. A production symbol keeps its `implements` link and gets `covered_by` to its test, and `executable_for` is reserved for a symbol that stands for the test itself. If a real `kb_upsert` is refused after a dry run passed, the skill repairs the same target instead of working around it with a new entity. In the 2026-10-21b SkillOpt campaign the traceability mean rose from 82.33 to 93.17, and executable coverage from 51.67 to 95.83, with no family regressing.
