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

A certificate now proves the requirement claims it names, and `proved` says which claims a requirement's certificates cover.

A certificate-kind proof contract (`exhaustive`, `typecheck`, `arithmetic`, `smt`) names the claim keys it proves in the new `proves` field. For each named claim Kibi derives what the certificate has to establish from the claim's grounding fact, so the author never states it:

- A set fact (the new `value_type: set` with `value_set`) gives a set-equality obligation. An `exhaustive` certificate meets it when its domain, read from the code, is exactly the set and the domain symbol is covered by the test; a `typecheck` certificate meets it when Kibi's own witness, which compares the domain type with the set both ways, compiles.
- A numeric fact gives a constraint. An `arithmetic` or `smt` certificate meets it when its assumptions are the fact's constraints; a new `value_source` field names the code constants that bound the variable, which `constraint_source` used to require.
- A fact with no derivation (a behavioral claim) gives an attested binding, which counts as `tested`.

`kibi prove` records one binding per claim in the receipt's `claim_bindings` (derived, attested or rejected, with the reason) and prints it. Kibi re-judges each binding against the current KB when it reports, so a binding goes stale when its fact changes. A requirement reports `proved` only when every applicable claim has a derived, code-scope binding from a fresh certificate that re-checks.

The semantic advisor now models closed lists ("must be one of red, green or blue") as set facts. KB consistency certificates support set facts.

`kibi coverage`, `kibi proof explain` and the HTML report show claim-level evidence (`claimSummary`, `claimEvidence`, "n/m claims proved"), and the `proved` floor gap lists the unproved claims. The new blocking `proof-contract-claims` check reports a certificate contract that names no claims, names a key that is no current claim, or names a claim its kind cannot express. The kibi-usage (2.27.0) and kibi-traceability (2.2.0) skills explain claim binding to agents.

**Migration (breaking):** KB schema 12. `kibi migrate` pins `proves` on every certificate contract with exactly one claim it could prove and lists the rest for review; until a contract names its claims, `proof-contract-claims` blocks and its certificate proves nothing. A requirement that reported `proved` from a certificate before reports `tested` until its claims are bound and re-proved. The requirement proof payload is now `kibi.requirement-proof.v5`. Facts with a legacy `allowed_values` list are read as sets; nothing is rewritten.
