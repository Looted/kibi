---
"kibi-core": patch
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Claim-bound proofs are easier to adopt on an existing project.

- A count claim over a collection reads the collection itself: a `value_source` entry with `measure: count` uses the size of a list, set, map or object export, so "exactly 32 tools" no longer needs a number export added beside the list just for the proof.
- `kibi migrate`'s claim-binding reviews now list every modeled claim the test reaches through its scenarios, with the binding a certificate of its kind would get (provable, attested only, or why the kind cannot express the fact), instead of an empty list when no claim was provable as modeled.
- The semantic advisor models "every member of S has P" requirements as a set fact named for P whose value is S, so the property stays in the requirement instead of only in the test.

Deleting an `implements` relationship now also removes the target from a symbol's legacy `links:` list in `symbols.yaml` (dropping the list when it empties), so the deleted edge no longer comes back on the next `kibi sync --rebuild`.

The kibi-usage skill (2.28.0) explains count measures and every-member claims.
