---
"kibi-cli": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.

- Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
- Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
- Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
- Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
- Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.
