---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-zcode": patch
"kibi-runtime": patch
"kibi-cursor": patch
---

A file with no linked symbols is no longer read as a file no rule covers. Before such a file is edited, the Claude Code and Codex hooks name the current requirements whose titles share the file's path words, and a `kb_check` scoped to the file reports the same candidates, so an agent changing `coach-dashboard.html` is pointed at the coach inbox requirement instead of concluding there is no knowledge-base impact. Agents are also told that recording the behavior a change adds is part of finishing it and needs no permission.

- `kibi-agent-core`: new `requirement-candidates` module (`pathTopicWords`, `rankRequirementCandidates`, `requirementCandidatesForPath`); `unownedSourceNote` takes the candidates, says that no link does not mean no rule, and drops candidates rather than exceed the snippet budget.
- `kibi-cli`: an impact-enabled `kb_check` emits `source_file_unowned` (`info`, non-blocking) for each file in `sourceFiles` that no manifest symbol links to a requirement, including files Kibi does not extract symbols from (HTML templates), with `evidence.candidates`. The unlinked-symbol `symbol_semantic_review_needed` suggestion now says recording the behavior needs no permission.
- `kibi-claude`, `kibi-codex`: the unlinked-file edit note names candidate requirements. The Claude Code session-start context no longer says unlinked files get no context, and says recording new behavior needs no permission; ZCode's session-start context says the same.
- `kibi-usage` skill 2.19.0: record new behavior without asking; confirm the candidates an unlinked-file note names.
