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

Proof contracts can now earn `proved` evidence with certificate proof kinds that Kibi re-checks itself.

A proof contract sets `kind` to one of the runner kinds `e2e`, `example` or `property`, which support `tested`, or to a certificate kind, which supports `proved`:

- `exhaustive` runs a check on every member of a finite domain the code defines. The contract names the domain with `domain_source`; the proof must import that symbol, and Kibi loads the export itself and rejects a certificate that does not cover exactly its members.
- `typecheck` names a `witness` file that stops compiling when a domain member goes unhandled (an exhaustive switch ending in a `never` check, or a mapped type over the domain). Kibi compiles the witness itself, strict and with the workspace's TypeScript, and checks it is the workspace file and imports the domain.
- `arithmetic` states a claim about one integer or real variable. Its assumptions must be exactly the constraints of the typed numeric facts the contract names in `constraint_source`, and Kibi decides the claim exactly: the facts must be satisfiable and entail it for every value.
- `smt` carries an SMT-LIB query that asserts the `constraint_source` facts and the claim's negation. Kibi re-runs z3 or cvc5 on it and accepts only `unsat`.

`arithmetic` and `smt` prove that the knowledge base's facts entail a claim, not that code follows those facts.

Tests build certificates with the new `kibi-cli/proof-certificates` helpers and leave them in the directory `kibi prove` names in `KIBI_PROOF_CERTIFICATES`; outside `kibi prove` writing a certificate does nothing. A requirement reports `proved` when it is `tested` and every scenario has a test whose fresh receipt carries a certificate that still re-checks. `kibi coverage`, `kibi proof explain` and the report show the new certificate evidence, the report counts requirements proved by certificate, and a stored certificate that stops re-checking is listed with its reason under `certificateRejections`.

**Receipts:** `kibi prove` now writes `kibi.proof-receipt.v2`, which adds the contract kind, the evidence level, the certificate, its digest and, when a certificate is rejected, the reason. Existing `kibi.proof-receipt.v1` receipts stay valid and support `tested`. Older Kibi versions do not read v2 receipts, so upgrade every checkout that proves requirements together. The kibi-usage skill (2.26.0) explains certificate kinds to agents.
