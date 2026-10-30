---
title: Required SWI-Prolog libraries
status: open
priority: must
firmness: firm
semantic_text: 'The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences. The prefix __KIBI_ERROR__: shall open a Prolog error line.'
semantic_clauses:
  - The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences.
  - 'The prefix __KIBI_ERROR__: shall open a Prolog error line.'
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:22:05.468Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 317d9fcfda6e6d8200a5a207b924eb6cd86cb32fe32dde9046bc57471ae59145
semantic_inventory:
  - claim_key: CLAIM-D471C4F1472AA73D
    claim_text: The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences
    role: normative
    status: modeled
    span:
      start: 0
      end: 243
  - claim_key: CLAIM-BF089089E4627FF2
    claim_text: 'The prefix __KIBI_ERROR__: shall open a Prolog error line'
    role: normative
    status: modeled
    span:
      start: 245
      end: 302
logic_claims:
  - CLAIM-D471C4F1472AA73D
  - CLAIM-BF089089E4627FF2
id: REQ-prolog-runtime-libraries
type: req
---
The required SWI-Prolog libraries shall be semweb/rdf_db, semweb/rdf_persistency, semweb/sparql_client, pcre, crypto, sha, http/json, http/json_convert, chr, clpfd, thread, persistency, filesex, readutil, date, aggregate and solution_sequences. The prefix __KIBI_ERROR__: shall open a Prolog error line.

## Context

REQ-prolog-bundled-runtime accepts a SWI-Prolog runtime only when it loads every library Kibi needs, and Kibi reads engine errors by a fixed line prefix. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"