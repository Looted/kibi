---
"kibi-cli": patch
"kibi-core": patch
---

`kibi check`, `kibi coverage`, `kibi report` and `kibi sync` scale to much larger knowledge bases. On a KB four times the size of this repository's own (about 1,700 requirements and 7,500 facts), check, coverage and report now finish instead of hitting the 120 second query timeout, and on this repository's KB `kibi check` takes about half as long. Results are unchanged.

- Contradiction candidates are paired through subject and predicate indexes instead of comparing every requirement with every other one, and opposing-rule checks pair only requirements that actually link rule facts.
- Contradiction witnesses, the consistency verification bundle and the predicate schema table are computed once per KB generation and reused by every check that needs them, until the next write.
- Later pages of an entity query reuse the ids the first page matched, and coverage pages reuse the status metadata computed with the first page.
- When a sync relationship batch contains a link that cannot be stored, the valid links in that batch are still written in one call and only the failing ones are retried one by one, instead of falling back to one round trip per relationship.
