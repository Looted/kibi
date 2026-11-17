---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

A rule someone states is now recorded with one small call: `kb_record` (CLI `kibi record --input -`) takes the rule, why it exists, who said it, their words and the code that implements it, and answers with whether a commit would pass. The agent no longer has to read the full `kb_upsert` schema and assemble a requirement payload by hand for a first write: on a test rule the call is 238 characters against a 1,608-character tool definition, where the same write through `kb_upsert` was a 436-character payload against a 10,511-character one.

- `kb_record` inputs: `statement`, `why`, `saidBy` (`user`, `maintainer` or `agent`), optional `quote`, `code` (`[{file, symbol}]`), optional `test` and `dryRun`.
- It builds exactly one `kb_upsert` payload (a new open requirement, `firm` with a human origin and the quote as `origin.ref` when a person stated it, `default` with an agent origin when the agent chose it; the code as `implementedBy`; a test as `verified_by` and `coveredBy`) and runs it through `kb_upsert` unchanged: the same schema, advisor, firmness, approval and write path. It never sets `origin.approved_by`.
- It then runs `kb_check` with `changed: true` for the files the code names and returns that verdict (`commitAllowed`, each finding with `blocks`) and the remaining steps as `nextActions`. The result equals `kb_upsert` of the returned payload followed by that check.
- `dryRun: true` returns the payload and `kb_upsert`'s dry run and writes nothing.
- Facts, relationships, proof contracts, updates and other modeling stay on `kb_upsert`; `kb_record` refuses those fields and says so.
- `kb_record` joins the default MCP profile (now seven tools). The `kb_upsert` description is shorter and points first writes at `kb_record`.
- Advertised MCP schemas are smaller, so the seventh tool costs less than it saves: every choice among strings is written as `enum` instead of `anyOf` of `const`, and `kb_check` advertises `rules` as plain strings (an unknown rule name is still refused, with the allowed names). The default profile's model-facing size went from 26,420 characters to 21,309 with kb_record included (an empty knowledge base: 28,599), and every input is validated exactly as before.
- The capture template the plugins show when a person states a rule (Claude Code, Codex, Cursor, OpenCode, ZCode, and the no-harness session brief) is now a `kb_record` call, and the `kibi-usage` and `kibi-decisions` skills record a new rule with `kb_record`. Every plugin counts a `kb_record` call, MCP or CLI, as the requirement write it asks for, and a `kb_record` dry run as a preview.

Migration: nothing to change. Existing `kb_upsert` calls behave as before. Hosts that list tools by name see `kb_record` in the default profile; set `KIBI_MCP_TOOLS=full` or pin a tool list as before if you restrict tools.
