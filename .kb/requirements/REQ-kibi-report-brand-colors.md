---
title: Health report brand colours
status: open
priority: must
firmness: firm
semantic_text: 'A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger. The Kibi carbon brand colour shall be #1d1e23. The Kibi deep carbon brand colour shall be #111318. The Kibi panel brand colour shall be #191c22. The Kibi ice brand colour shall be #a2d3f4. The Kibi signal brand colour shall be #3e8ed6. The Kibi snow brand colour shall be #f4f8fb. The Kibi mist brand colour shall be #aab8c2. The Kibi rail brand colour shall be #34434f. The Kibi success brand colour shall be #63c99a. The Kibi warning brand colour shall be #f2b84b. The Kibi danger brand colour shall be #f07178.'
semantic_clauses:
  - A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger.
  - 'The Kibi carbon brand colour shall be #1d1e23.'
  - 'The Kibi deep carbon brand colour shall be #111318.'
  - 'The Kibi panel brand colour shall be #191c22.'
  - 'The Kibi ice brand colour shall be #a2d3f4.'
  - 'The Kibi signal brand colour shall be #3e8ed6.'
  - 'The Kibi snow brand colour shall be #f4f8fb.'
  - 'The Kibi mist brand colour shall be #aab8c2.'
  - 'The Kibi rail brand colour shall be #34434f.'
  - 'The Kibi success brand colour shall be #63c99a.'
  - 'The Kibi warning brand colour shall be #f2b84b.'
  - 'The Kibi danger brand colour shall be #f07178.'
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:27:43.951Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d20e2394cc2f639967fcda308a61ebf2dad44e7f16891fee66946e9b63edd7b2
semantic_inventory:
  - claim_key: CLAIM-13A7E1BD0A658DBA
    claim_text: A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger
    role: normative
    status: modeled
    span:
      start: 0
      end: 113
  - claim_key: CLAIM-8C7E4BA35F56F1A5
    claim_text: 'The Kibi carbon brand colour shall be #1d1e23'
    role: normative
    status: modeled
    span:
      start: 115
      end: 160
  - claim_key: CLAIM-293B472E51239938
    claim_text: 'The Kibi deep carbon brand colour shall be #111318'
    role: normative
    status: modeled
    span:
      start: 162
      end: 212
  - claim_key: CLAIM-EADEA4998EA62007
    claim_text: 'The Kibi panel brand colour shall be #191c22'
    role: normative
    status: modeled
    span:
      start: 214
      end: 258
  - claim_key: CLAIM-D2446B9AFF8ECBA9
    claim_text: 'The Kibi ice brand colour shall be #a2d3f4'
    role: normative
    status: modeled
    span:
      start: 260
      end: 302
  - claim_key: CLAIM-A8769894894F68D8
    claim_text: 'The Kibi signal brand colour shall be #3e8ed6'
    role: normative
    status: modeled
    span:
      start: 304
      end: 349
  - claim_key: CLAIM-EF539C8110C52A2B
    claim_text: 'The Kibi snow brand colour shall be #f4f8fb'
    role: normative
    status: modeled
    span:
      start: 351
      end: 394
  - claim_key: CLAIM-F2A54738EC65C71E
    claim_text: 'The Kibi mist brand colour shall be #aab8c2'
    role: normative
    status: modeled
    span:
      start: 396
      end: 439
  - claim_key: CLAIM-8B4ECDDC8FDC79B6
    claim_text: 'The Kibi rail brand colour shall be #34434f'
    role: normative
    status: modeled
    span:
      start: 441
      end: 484
  - claim_key: CLAIM-1987F08DB1A22339
    claim_text: 'The Kibi success brand colour shall be #63c99a'
    role: normative
    status: modeled
    span:
      start: 486
      end: 532
  - claim_key: CLAIM-B65B34155577E262
    claim_text: 'The Kibi warning brand colour shall be #f2b84b'
    role: normative
    status: modeled
    span:
      start: 534
      end: 580
  - claim_key: CLAIM-A5F9B7D9BBEFB706
    claim_text: 'The Kibi danger brand colour shall be #f07178'
    role: normative
    status: modeled
    span:
      start: 582
      end: 627
logic_claims:
  - CLAIM-13A7E1BD0A658DBA
  - CLAIM-8C7E4BA35F56F1A5
  - CLAIM-293B472E51239938
  - CLAIM-EADEA4998EA62007
  - CLAIM-D2446B9AFF8ECBA9
  - CLAIM-A8769894894F68D8
  - CLAIM-EF539C8110C52A2B
  - CLAIM-F2A54738EC65C71E
  - CLAIM-8B4ECDDC8FDC79B6
  - CLAIM-1987F08DB1A22339
  - CLAIM-B65B34155577E262
  - CLAIM-A5F9B7D9BBEFB706
id: REQ-kibi-report-brand-colors
type: req
---
A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger. The Kibi carbon brand colour shall be #1d1e23. The Kibi deep carbon brand colour shall be #111318. The Kibi panel brand colour shall be #191c22. The Kibi ice brand colour shall be #a2d3f4. The Kibi signal brand colour shall be #3e8ed6. The Kibi snow brand colour shall be #f4f8fb. The Kibi mist brand colour shall be #aab8c2. The Kibi rail brand colour shall be #34434f. The Kibi success brand colour shall be #63c99a. The Kibi warning brand colour shall be #f2b84b. The Kibi danger brand colour shall be #f07178.

## Context

packages/cli/src/report/brand.ts holds the palette REQ-kibi-branded-health-report draws the report, logo and badge with. Every colour name and value is stated here so the palette is proved against the brand table.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"