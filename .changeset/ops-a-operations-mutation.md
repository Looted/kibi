---
"kibi-cli": patch
---

Fix several `kibi migrate` and semantic advisor edge cases found while tightening the bootstrap, migration, planning and semantic-advisor operations with exhaustive unit tests:

- The entity type and origin backfills now type an entity by the lane that holds it. Before, a workspace inside a folder named like a lane (for example `~/tests/repo`) could get the wrong `type`.
- Clauses that normalize to the same claim are reported once, not as repeated claim keys.
- A front matter list written at the key's own indentation (`tags:` then `- a`) is now read as that list, so a tag already present is not added a second time.
- Front matter edits now accept a key whose value line is followed only by an indented comment.
