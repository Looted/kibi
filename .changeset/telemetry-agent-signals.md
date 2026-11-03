---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-claude": minor
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

Telemetry now shows where agents struggle, using fixed signals only. A refused payload names the rule it broke (a JSON Schema keyword or a Kibi check such as `inventory_missing`) and the Kibi schema field (an unknown field name is sent as `other`); an upsert reports whether it was a dry run, a bucketed relationship count and its attempt on the same entity; a search reports a bucketed result count, whether it abstained or showed hints, and whether it repeated a search from the last two minutes; events say whether a Kibi skill was loaded in the workspace in the last 30 minutes, which every host's hooks now detect; and a Kibi fault carries its top stack frame inside Kibi's own packages with a fingerprint, never a path, line or message. Retries, repeated searches and skill loads are matched from one-way hashes kept next to the local queue. A kb_validate_upsert or dry-run refusal also returns `rejection` with its code and issues. The Claude Code plugin's PreToolUse hook now also runs for the Skill tool.
