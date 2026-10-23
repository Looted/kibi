---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kibi check` and `kb_check` now prove that the knowledge base is consistent, and leave a certificate for each answer that an independent checker re-checks.

The new canonical `kb-consistency` rule states four theorems about the facts current requirements name and produces a `kibi.certificates.v1` certificate for each: property facts are consistent (a model per subject, property and scope, or an irreducible contradiction core with one model per dropped fact), predicate facts and allow/deny decisions are consistent (one truth value per atom, one decision per key, or the two facts that disagree), and stored rules are stratified (a stratum per rule predicate, or a negation cycle). A separate checker module re-checks every certificate by evaluation only; it never runs the search that found it and does not load `checks.pl`. Each contradiction it re-verifies is a blocking violation that names the core facts and the requirements behind them, with the certificate under `evidence.certificate`; a certificate the checker rejects also blocks.

The property theorem is joint, so facts that contradict only together (every pair still admits a value) are reported even though the pairwise `domain-contradictions` rule is silent. `kibi check --staged` runs the rule too, so a commit that introduces such a contradiction is blocked. Contexts the checker cannot compare (mixed value types or units, unsupported operators or polarities, cores whose validity windows never overlap) are reported by the new advisory `kb-consistency-unresolved` rule and never count as consistent. Opposing rule pairs and scenario feasibility are not certified yet.

Certificates are regenerated on each run and are not committed. `kibi check --write-certificates <file>` saves the bundle, and `kibi check --certificates <file>` re-checks a saved one and prints the `kibi.verification.v1` report (a verdict of `proved`, `disproved` or `unresolved` per theorem, and every rejected certificate with the reason). The kibi-usage skill (2.24.0) tells agents how to act on the new findings.

**Migration (breaking for KBs with joint contradictions).** No knowledge-base change is needed. A knowledge base whose facts contradict only jointly now fails `kibi check` until one of the requirements is changed or superseded; the violation names the core and the requirements to choose from. Integrations that pass a fixed `--rules` list or `rules` input are unaffected until they add `kb-consistency`.
