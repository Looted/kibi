---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Close the proof-lane issues still open after the last round of fixes.

- `kibi upsert` keeps the properties an update leaves out in the compiled store, as the authored file already did. A relationship-only upsert no longer drops `required_evidence` (or `priority`, `owner`, `tags` and the rest) from the stored requirement, so `evidence-floor` stops judging it by firmness until a `kibi sync --rebuild`.
- A Python certificate domain loads with `KIBI_PYTHON`, the active virtualenv, or a `.venv`/`venv` from the domain file's directory up to the workspace root before `python3` on `PATH`, so a domain that imports project dependencies is checked. A failed load quotes the traceback's exception line (`ModuleNotFoundError: ...`) instead of its header.
- The `kibi coverage` summary carries `linkCoverageScope: "priority_must"`, and the table titles the link counts `Links (priority: must)`, so `evaluated: 0` on a KB without must-priority requirements no longer reads as if nothing was proved.
- `kibi sync` counts distinct relationships in both summary blocks: an edge stated in front matter and again in a symbol manifest or shard counts once, so the imported count no longer exceeds the KB total.
- After an applied migration, `remainingPlan` is a `kibi.migration-plan-digest.v2`: it lists the first 20 automatic actions as `{ id, code, state, autoApplicable, dependsOn }` and counts all of them under `automaticSummary` (`total`, `ready`, `blocked`, `omitted`), instead of embedding every automatic action with its full input.
