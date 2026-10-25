---
title: A certificate proves the requirement claims Kibi derives its obligation from
status: accepted
firmness: default
tags:
  - proof
  - certificate
  - evidence-levels
origin:
  kind: agent
  recorded_at: '2026-10-25T18:22:43.126Z'
id: ADR-kibi-claim-bound-proofs
type: adr
---
# ADR: A certificate proves the requirement claims Kibi derives its obligation from

## Decision

A certificate proves claims, not requirements. A certificate-kind proof contract names the claim keys it proves in `proves`. For each named claim Kibi derives from the claim's grounding fact what the certificate has to establish: a set fact (`value_type: set`) gives a set-equality obligation that `exhaustive` and `typecheck` certificates can meet, and a numeric fact gives a constraint that `arithmetic` and `smt` certificates can meet. Kibi records one binding per claim in the receipt (`claim_bindings`): derived when the certificate establishes the derived obligation, attested when the fact has no derivation, rejected otherwise, with the reason. A requirement is proved only when every applicable claim has a derived, code-scope binding from a fresh certificate that re-checks.

## Choices

- Attested is a binding, not a fifth evidence level: an attested claim counts as tested. The ladder keeps four levels with one meaning each.
- Arithmetic and SMT certificates whose assumptions come only from the knowledge base's facts prove that the facts entail the claim; their bindings have scope intent and the claim stays tested. Reading the value from the code (`value_source`) gives scope code.
- Sets are a fact value type (`value_set`) rather than a joined string, so the set a claim states is typed data Kibi can compare with a domain. The legacy `allowed_values` string joined with `|` reads as the same set.
- No per-claim evidence floors: `required_evidence` stays per requirement, and its finding lists the claims below proved.
- Contracts written before schema 12 keep counting as tested, and the blocking `proof-contract-claims` rule reports them; the migration pins `proves` where exactly one claim can be derived. No approval is needed to attest a claim, because an attested binding never counts as proved.
- Claim keys stay content hashes of the claim text: rewording a claim changes its key, and a contract naming the old key is reported until it is updated.
- Bindings are judged at ingest, where Kibi can read code, and judged again whenever evidence is reported: a binding whose fact changed since ingest, whose claim is no longer modeled or whose certificate no longer re-checks against the obligation is rejected.

## Rationale

- Kibi exists so that what a project says it does stays true. A proved label that does not say which claims it covers overstates the evidence, which is the failure the evidence ladder exists to prevent.
- Deriving the obligation from the fact, instead of trusting a label in the test, keeps a test from proving a claim by naming it.
- Partial proofs are visible: coverage reports how many claims of each requirement are proved, and `kibi proof explain` shows every binding.
