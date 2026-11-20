---
title: kibi.vibe.skills_mirror subject
status: active
fact_kind: subject
subject_key: kibi.vibe.skills_mirror
origin:
  kind: agent
  recorded_at: '2026-11-19T20:09:38.832Z'
id: FACT-SUBJ-VIBE-SKILLS-MIRROR
type: fact
---
The skills mirror is the generated copy of the canonical skills under packages/vibe/skills produced by sync-agent-skills with target vibe, where the frontmatter name must equal the skill id because Vibe requires it to match the directory, and CI must fail whenever the mirror drifts from the canonical source. It is not about hook runtime behavior or the MCP launcher.