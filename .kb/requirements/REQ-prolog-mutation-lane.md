---
title: Prolog mutation lane runs the pinned Mutalog version over the Prolog core
status: open
priority: should
tags:
  - prolog
  - mutation
  - testing
text_ref: scripts/run-prolog-mutation.pl
semantic_text: The Prolog mutation runner must run the Mutalog checkout named by the MUTALOG_HOME environment variable when it is set. The Prolog mutation runner must otherwise run the pinned Mutalog version from the repository-local pack directory, installing it there only when that version is missing. The Prolog mutation runner must pass its command-line arguments to Mutalog unchanged.
semantic_source_field: semantic_text
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 48d5e71fc6a16b9fb085825817076c61d674ca3ccebbb4146b1e1c6e5e4c815e
semantic_inventory:
  - claim_key: CLAIM-9D8D115490D80266
    claim_text: The Prolog mutation runner must run the Mutalog checkout named by the MUTALOG_HOME environment variable when it is set
    role: normative
    status: modeled
    span:
      start: 0
      end: 118
  - claim_key: CLAIM-4E587E213B341F06
    claim_text: The Prolog mutation runner must otherwise run the pinned Mutalog version from the repository-local pack directory, installing it there only when that version is missing
    role: normative
    status: modeled
    span:
      start: 120
      end: 288
  - claim_key: CLAIM-25D770C07A103D90
    claim_text: The Prolog mutation runner must pass its command-line arguments to Mutalog unchanged
    role: normative
    status: modeled
    span:
      start: 290
      end: 374
logic_claims:
  - CLAIM-9D8D115490D80266
  - CLAIM-4E587E213B341F06
  - CLAIM-25D770C07A103D90
semantic_clauses:
  - The Prolog mutation runner must run the Mutalog checkout named by the MUTALOG_HOME environment variable when it is set
  - The Prolog mutation runner must otherwise run the pinned Mutalog version from the repository-local pack directory, installing it there only when that version is missing
  - The Prolog mutation runner must pass its command-line arguments to Mutalog unchanged
origin:
  kind: agent
  recorded_at: '2026-10-29T16:12:13.562Z'
id: REQ-prolog-mutation-lane
type: req
required_evidence: tested
---
The Prolog mutation runner must run the Mutalog checkout named by the MUTALOG_HOME environment variable when it is set. The Prolog mutation runner must otherwise run the pinned Mutalog version from the repository-local pack directory, installing it there only when that version is missing. The Prolog mutation runner must pass its command-line arguments to Mutalog unchanged.

## Context

The Stryker lane cannot mutate the SWI-Prolog sources in packages/core, so the core had coverage but no mutation testing. Mutalog fills that gap. The maintainer asked for a `test:mutation:prolog` lane that starts report-only on logic_ir.pl. Pinning the version and installing into `.cache/prolog-packs` keeps runs reproducible and leaves contributors' own SWI-Prolog packs untouched.

## Source

"Kibi PR. This adds a test:mutation:prolog script beside test:coverage:prolog in Kibi. It runs Mutalog on logic_ir.pl with logic_ir.plt and writes reports to reports/mutation/prolog/. It starts report-only (no break threshold) until the survivors have been triaged into ignore_mutants." Approved by the maintainer: "Yes, please."