---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

A SWI-Prolog project can now prove its requirements against its own predicates. Exhaustive domains, `value_source` numbers, rule tables, state machines and patterns read `.pl` and `.plt` files with the SWI-Prolog Kibi already runs on, the same way they read TypeScript, JavaScript and Python exports, so a Prolog library no longer has to fall back to file patterns or a harness written in another language to reach `proved`. The kibi-usage skill (2.38.0) ships a `kibi_certificate` module (`resources/prolog-proofs.md`) that Prolog proof files use to write their certificates.

In a proof contract, `export` names a predicate indicator (`status/1`, `phrase//1`, `operators:operator/2`) and the new `arg` key on `domain_source` and `value_source` names the 1-based argument that holds the members of a predicate with more than one argument. A module file loads as its module and a plain file into `user`. Kibi refuses a read it cannot decide exactly: solutions that leave the argument unbound, more than 100,000 solutions, several arguments without `arg`, `arg` together with `field`, and `arg` on a TypeScript or Python export. A Prolog proof file imports its domain when it names the predicate and loads the file (`use_module`, `library(X)` for a pack's `prolog/` directory, `consult`, `ensure_loaded` or a `:- [...]` list), or when it is the `.plt` beside it. A rule predicate is called once per row and decided by success; a transition table is a predicate of arity 2 or 3 whose solutions are the edges, or a `next/3` predicate driven over its `domains`; a pattern is a single atom or string. One certificate reads one language, and a contract mixing languages is refused.

Code proof evaluation now goes through one evaluator per language, and a file in a language without an evaluator is refused with the language named. A code proof receipt is now also bound to the files of the symbols its contract reads (`domain_source`, `value_source`, `initial_source`, `pattern_source`, `domains`, `predicate_source`), so it goes stale when the file a domain is read from changes even when that symbol is not `covered_by` the test.

## Migration

No files change shape. Code proof receipts whose contracts read a symbol outside the test's covered symbols get a new binding hash and need `kibi prove` once.
