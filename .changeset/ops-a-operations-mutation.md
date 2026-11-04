---
"kibi-cli": patch
---

Fix several `kibi migrate` and semantic advisor edge cases found while tightening the bootstrap, migration, planning and semantic-advisor operations with exhaustive unit tests:

- The entity type and origin backfills now type an entity by the lane that holds it. Before, a workspace inside a folder named like a lane (for example `~/tests/repo`) could get the wrong `type`.
- Clauses that normalize to the same claim are reported once, not as repeated claim keys.
- A front matter list written at the key's own indentation (`tags:` then `- a`) is now read as that list, so a tag already present is not added a second time.
- Front matter edits now accept a key whose value line is followed only by an indented comment.
- The case preview for a set property claim without a list of members now shows no cases, matching what the proof ladder derives, instead of a value-outside-the-set case.
- A conditional requirement whose condition uses "equals" with a word value ("only when the account status equals active") now becomes a rule instead of staying unparsed.
- Strict suggestions now read a retention period in a singular unit ("retained for 1 day") as `retention_days`, like expiry periods, instead of `retention_day`.
- Source-shape suggestions now accept relative module names (`./local`, `../shared`) as members, and "property" in the singular as a field word ("every object must declare a non-null property id").
