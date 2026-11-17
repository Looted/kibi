---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-agent-core": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Recording a rule the person stated now takes one `kb_upsert` call with the reason in a `why` field, and that call leaves no `kb_check` finding it could have avoided. What only later work can settle (the subject a claim is about, a scenario and a test, a proof) comes back as `nextActions` entries with ready inputs instead of warnings. The write also names the current requirements on the same terms, so an older version of a rule is superseded instead of left beside the new one.

- `kb_upsert` (MCP and `kibi upsert`) accepts `why` on a requirement. It is written to `rationale` and to the body's reason section (its `## Context`, or an existing `## Why` or `## Rationale` section), and `origin.ref` becomes the `## Source` section of a body that has none. An update without `document.body` revises the stored file. A `why` that is not text, disagrees with a `rationale` sent beside it, or is sent on another entity type is refused with `VALIDATION_FAILED` (rule `requirement_why_invalid`).
- A requirement write that sends `document.body` without `semantic_text`, for a requirement with no stored `semantic_text`, records the body's statement as `semantic_text`, so the server-filled proposition inventory matches the statement the file holds. Before, such a write derived the inventory from the title and `kibi check --staged` refused the new requirement.
- A committed requirement write returns `nextActions` (`operation`, `code`, `input`, `reason`, `required`) for `entity-context-missing`, `claim-subject-missing` (the stored inventory with the closest existing subject filled in, alternatives named), and, for a requirement without a test, `evidence-floor` and `symbol-coverage` (a scenario and its `specified_by` link when the requirement has none, a test of its scenarios, `covered_by` per uncovered implementing symbol, and a `kibi prove` step when the floor is `tested` or `proved`). The warnings those steps replace are no longer listed in `warnings`.
- The write result's `relatedRequirements` lists up to five other current requirements whose title and statement share most of its topic words (numbers do not count, so a floor of 9 matches a new floor of 10), as `{id, statement}`.
- The rule capture template the Claude Code, Codex, Cursor and ZCode hooks give after a rule prompt carries `why` and ends by pointing at the result's `nextActions`. When the sentence that states the rule, or the next one, gives a reason with "because" or "so that", the prompt-time rule note and the template ask the agent to put that reason in `why`.
- The generated `kibi-usage` field reference lists `why`.
