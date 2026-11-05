---
"kibi-cli": patch
---

Fix several `kibi migrate`, `kibi check` and semantic advisor edge cases found while tightening the bootstrap, migration, planning, semantic-advisor and check code with exhaustive unit tests:

- The entity type and origin backfills now type an entity by the lane that holds it. Before, a workspace inside a folder named like a lane (for example `~/tests/repo`) could get the wrong `type`.
- Clauses that normalize to the same claim are reported once, not as repeated claim keys.
- A front matter list written at the key's own indentation (`tags:` then `- a`) is now read as that list, so a tag already present is not added a second time.
- Front matter edits now accept a key whose value line is followed only by an indented comment.
- The case preview for a set property claim without a list of members now shows no cases, matching what the proof ladder derives, instead of a value-outside-the-set case.
- A conditional requirement whose condition uses "equals" with a word value ("only when the account status equals active") now becomes a rule instead of staying unparsed.
- Strict suggestions now read a retention period in a singular unit ("retained for 1 day") as `retention_days`, like expiry periods, instead of `retention_day`.
- Source-shape suggestions now accept relative module names (`./local`, `../shared`) as members, and "property" in the singular as a field word ("every object must declare a non-null property id").
- A workspace file whose name starts with two dots (`..notes.md`) is no longer treated as outside the workspace when `kibi migrate` checks whether an authored `source` path exists.
- Re-deriving the semantic inventory of a requirement whose current prose has only context claims (rationale, examples) now removes `logic_claims` instead of writing an empty list the schema rejects. Before, `kibi migrate` stopped with a schema error for such a requirement.
- A rule suggestion built from a host interpretation now keeps its confidence within 0 to 1, as the interpretation result already did, instead of repeating an out-of-range value.
- Marking coarse symbol links `legacy-link` now keeps the final newline of `.kb/symbols.yaml`. Before, a reason added to the last symbol was written after a blank line, at the very end of the file without a newline.
- `kb_compile_intent` no longer writes an empty `logic_claims` list for an intent with only context claims (rationale, examples). Such a plan used to need resolution with a schema error instead of being ready.
- The `kibi check` integrity rules now read a quoted entity id that contains a comma as one id. Before, such an id was split in two and reported as dangling.
- `kibi sync` now keeps a backslash in a staged file name as it is when it lists new staged sources. Before, the backslash was read as a folder separator, so such a file was not recognized as newly staged.
