---
title: An unscoped check counts symbol debt and lists it only on request
status: open
priority: must
required_evidence: tested
semantic_text: kibi check and kb_check run without a rule or file scope must report unrecorded declarations in files that have at least one symbol record as a non-blocking count of declarations and files, and must list them per file only when asked with kibi check --symbol-debt or kb_check includeSymbolDebt:true.
tags:
  - check
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413. Maintainer decision, 2026-11-16, approving this statement as worded.'
  recorded_at: '2026-11-16T15:47:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: df4ebc44185369895adda8089d5d5684006519cf7148a001a0b590af88eae6bb
semantic_inventory:
  - claim_key: CLAIM-EE6659EC1CAF94D7
    claim_text: kibi check and kb_check run without a rule or file scope must report unrecorded declarations in files that have at least one symbol record as a non-blocking count of declarations and files, and must list them per file only when asked with kibi check --symbol-debt or kb_check includeSymbolDebt:true
    role: normative
    status: modeled
    span:
      start: 0
      end: 298
logic_claims:
  - CLAIM-EE6659EC1CAF94D7
id: REQ-check-symbol-debt-count
type: req
---
kibi check and kb_check run without a rule or file scope must report unrecorded declarations in files that have at least one symbol record as a non-blocking count of declarations and files, and must list them per file only when asked with kibi check --symbol-debt or kb_check includeSymbolDebt:true.

## Why

The per-file list was most of a passing check: 2,924 declarations in 522 files made the text check about 89,600 characters and an unfiltered kb_check about 105,000, 97% of it a list that never blocks. Agents read it on every final check, or learned to cut the output with tail and miss the verdict. The count says the same thing in one sentence, and the list stays one flag away for a person who wants to record the debt.

## Context

An unscoped check reported the debt per file since symbol debt was introduced, under REQ-check-reports-symbol-debt. The count keeps its total and adds the number of files; JSON symbolDebt carries total and fileCount, and files only when asked.

## Why this changed

This supersedes REQ-check-reports-symbol-debt, which listed every unrecorded declaration per file on each unscoped check. Measured on Kibi's own KB, that list made a passing check 89,524 characters of text and 105,413 of kb_check JSON, while the decision it supports, that the debt never blocks, needs only the total. The old requirement kept the list visible so a person could see the debt; the count still shows it on the verdict line, and --symbol-debt or includeSymbolDebt lists it on request.

## Source

> Measured on Kibi's own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413.