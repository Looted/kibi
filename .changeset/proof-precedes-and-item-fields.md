---
"kibi-cli": minor
"kibi-core": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Source proofs can now prove the order of a list. A set fact with property `precedes` and operator `includes` lists pairs spelled `"A -> B"`; it holds when Kibi's read of the source has both A and B and every A comes before every B, and a failed check names the items that are out of order or missing. JSON and YAML sources take a new `field` key with `select: items`, which reads one key of each list item in document order (for example the `run` command of each workflow step).

An arithmetic `value_source` export can be dotted (`POLICY.eventLimit`) to read one field of an object export, in TypeScript, JavaScript and Python.

The kibi-usage skill (2.33.0) documents `field`, `precedes` and dotted exports.
