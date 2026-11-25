---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-claude": minor
"kibi-antigravity": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": minor
"kibi-vibe": minor
---

The person now decides two changes the agent used to be able to make alone: changing the project's Kibi level, and lowering a requirement's `required_evidence`.

- **Agent hooks.** An edit of the setting that changes the Kibi level, and an edit or `kb_upsert` call that lowers a requirement's `required_evidence`, are put to the person as far as each host allows:
  - Claude Code and Antigravity show a permission prompt that names the change.
  - Codex, Cursor and ZCode tell the agent to ask the person first, and grant no permission for the call.
  - OpenCode stops the change once per session with that notice, so the agent asks.
  - Vibe, which has no pre-tool hook, tells the agent after the edit or `kb_upsert` to ask the person and undo the change unless they agree. Its post-tool hook now also matches `kb_upsert`.
- **Signoff.** `kibi signoff` shows the project's Kibi level in the summary and the questions view. The summary lists a change of the level against the base commit, and each changed requirement whose evidence floor is now lower, under "Decisions only you make". The JSON view carries them as `level` and `decisions`.
