---
title: Code proofs read SWI-Prolog predicates the way they read JavaScript and Python exports
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - proof
  - certificate
  - prolog
  - multilingual
semantic_text: Kibi must read SWI-Prolog predicates as the domains, values, rules, state machines and patterns of code proofs. Kibi must refuse a Prolog domain whose solutions are unbound or whose projection is ambiguous. Kibi must refuse a code certificate that reads files in more than one language. A code proof receipt must go stale when the file its domain is read from changes.
semantic_clauses:
  - Kibi must read SWI-Prolog predicates as the domains, values, rules, state machines and patterns of code proofs.
  - Kibi must refuse a Prolog domain whose solutions are unbound or whose projection is ambiguous.
  - Kibi must refuse a code certificate that reads files in more than one language.
  - A code proof receipt must go stale when the file its domain is read from changes.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-31, to prove and certify in the languages Kibi discovers symbols for: "Kibi was supposed to be multilingual, so we should support roughly the same languages we support for symbol discovery."'
  approved_by: maintainer
  recorded_at: '2026-10-31T08:35:04.923Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b353e5bd61300d1c506579dec68d9ddb8c8d7f84ef025247df38c40549cf3b4d
semantic_inventory:
  - claim_key: CLAIM-48A997662FD2170B
    claim_text: Kibi must read SWI-Prolog predicates as the domains, values, rules, state machines and patterns of code proofs
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
  - claim_key: CLAIM-3AD8766B6AB22F32
    claim_text: Kibi must refuse a Prolog domain whose solutions are unbound or whose projection is ambiguous
    role: normative
    status: modeled
    span:
      start: 112
      end: 205
  - claim_key: CLAIM-32BC573B306D31EC
    claim_text: Kibi must refuse a code certificate that reads files in more than one language
    role: normative
    status: modeled
    span:
      start: 207
      end: 285
  - claim_key: CLAIM-81FCDC5124AB3F80
    claim_text: A code proof receipt must go stale when the file its domain is read from changes
    role: normative
    status: modeled
    span:
      start: 287
      end: 367
logic_claims:
  - CLAIM-48A997662FD2170B
  - CLAIM-3AD8766B6AB22F32
  - CLAIM-32BC573B306D31EC
  - CLAIM-81FCDC5124AB3F80
id: REQ-kibi-multilingual-code-proofs
type: req
---
Kibi must read SWI-Prolog predicates as the domains, values, rules, state machines and patterns of code proofs. Kibi must refuse a Prolog domain whose solutions are unbound or whose projection is ambiguous. Kibi must refuse a code certificate that reads files in more than one language. A code proof receipt must go stale when the file its domain is read from changes.

## Context

Code proofs (exhaustive domains, value_source numbers, rule tables, state machines and patterns) could only read JavaScript, TypeScript and Python, so a project written in SWI-Prolog had no way to reach proved: its proofs fell back to file patterns or a harness in another language, which Kibi rightly treats as weak evidence (issue #636). Kibi already discovers Prolog symbols, so proofs should read the same code. Kibi now runs a per-language evaluator, and the SWI-Prolog one loads the project file with the bundled SWI-Prolog and reads predicates by indicator (name/arity), projecting one argument with the new arg contract key. A read that cannot be decided exactly is refused rather than guessed, one certificate reads one language, and the receipt is bound to the file each domain is read from so it goes stale when that file changes. This is the first step of the plan to prove claims in the languages Kibi discovers symbols for.

## Source

Maintainer request, 2026-10-31: "Kibi was supposed to be multilingual, so we should support roughly the same languages we support for symbol discovery."