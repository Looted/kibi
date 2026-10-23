---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Add `kibi verify`: certificates for knowledge-base theorems, re-checked by an independent checker.

`kibi verify` states four theorems about the facts current requirements name and produces a `kibi.certificates.v1` certificate for each: property facts are consistent (a model per subject, property and scope, or an irreducible contradiction core with one model per dropped fact), predicate facts and allow/deny decisions are consistent (one truth value per atom, one decision per key, or the two facts that disagree), and stored rules are stratified (a stratum per rule predicate, or a negation cycle). A separate checker module re-checks every certificate by evaluation only; it never runs the search that found it and does not load `checks.pl`. The `kibi.verification.v1` report gives each theorem a verdict of `proved`, `disproved` or `unresolved` and lists every rejected certificate with the reason.

The property theorem is joint, so facts that contradict only together (every pair still admits a value) are reported even though the pairwise `domain-contradictions` rule is silent. Contexts the checker cannot compare (mixed value types or units, unsupported operators or polarities) and cores whose validity windows never overlap stay unresolved and never count as consistent. Opposing rule pairs and scenario feasibility are not certified yet and are listed as such.

`kibi verify` exits 1 when a certificate is rejected or missing or a theorem is disproved; `--write <file>` saves the bundle and `--certificates <file>` re-checks a saved one. Certificates are regenerated on each run and are not committed. The kibi-usage skill (2.24.0) tells agents when to run it.

**Migration:** none. To gate on it, add `kibi verify` after `kibi check` in CI; a knowledge base whose facts only contradict jointly fails there until one of the requirements is changed or superseded.
