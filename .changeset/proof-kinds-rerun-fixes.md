---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Follow-up fixes for the certificate proof kinds:

- A `rule` certificate now derives an `includes` set fact ("every role in owner and admin can invite"), checking the property on each listed member, so a true every-member claim reaches `proved`. Before, an `includes` fact was never read as a set and every binding to it was only attested. A `typecheck` certificate derives an `includes` fact on `required_fields`; the kinds that compare the whole set (`exhaustive`, a set-equality `typecheck`, `state_machine`) reject one, since they would read "at least these" as "exactly these".
- An arithmetic certificate whose assumptions contradict each other, such as a code count of 5 against a fact of exactly 4, is rejected with both values ("the assumptions contradict each other (count = 4 and count = 5) ...") instead of "the claim holds vacuously".
- A typecheck certificate whose own compile failed is rejected with the first error Kibi's compile of the witness reports, or with a note that Kibi's compile accepts it, instead of only "the type checker did not accept the witness". The declaration files the nearest `tsconfig.json` includes (a `reset.d.ts`, for example) are now part of the witness program.
- A receipt whose only derived claims are intent-scope (derived from the knowledge base's facts, with no value read from the code) records `evidence_level: tested`, the level coverage reports, instead of `proved`.

The kibi-usage skill (2.29.2) describes these and how to wire a count claim.
