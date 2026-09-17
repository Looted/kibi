---
title: ZCode Advisory Enforcement Boundary v1
status: open
priority: must
tags:
  - zcode
  - enforcement
  - boundary
semantic_text: |-
  The kibi-zcode adapter's asset scope is declarative plugin assets.

  The kibi-zcode adapter's lifecycle-hook scope is advisory.

  When kibi-zcode is installed and enabled, each of its outputs must remain advisory.

  When kibi-zcode is installed and enabled, it must not write directly to .kb.

  When kibi-zcode is installed and enabled, it must not replace MCP tooling behavior.

  The kibi-zcode adapter must not provide a hard enforcement gate.

  Kibi git hooks installed by kibi init must remain the hard enforcement gate.
logic_claims:
  - CLAIM-9DCD587219E400A4
  - CLAIM-83021AF2E8801882
  - CLAIM-56B43A58B68CEDA1
  - CLAIM-E85FAAA6BC1CD2BF
  - CLAIM-A06F5E6FD38C24EE
  - CLAIM-F8AF7D7F356F442D
  - CLAIM-E4C1D85972D18D64
semantic_clauses:
  - The kibi-zcode adapter's asset scope is declarative plugin assets
  - The kibi-zcode adapter's lifecycle-hook scope is advisory
  - When kibi-zcode is installed and enabled, each of its outputs must remain advisory
  - When kibi-zcode is installed and enabled, it must not write directly to .kb
  - When kibi-zcode is installed and enabled, it must not replace MCP tooling behavior
  - The kibi-zcode adapter must not provide a hard enforcement gate
  - Kibi git hooks installed by kibi init must remain the hard enforcement gate
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f770ec600163e1dd219a4ed933c906ec472f9ec7ea17af8c1ef7cc194f94b45c
semantic_inventory:
  - claim_key: CLAIM-9DCD587219E400A4
    claim_text: The kibi-zcode adapter's asset scope is declarative plugin assets
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 65
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-83021AF2E8801882
    claim_text: The kibi-zcode adapter's lifecycle-hook scope is advisory
    role: descriptive
    status: modeled
    span:
      start: 68
      end: 125
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-56B43A58B68CEDA1
    claim_text: When kibi-zcode is installed and enabled, each of its outputs must remain advisory
    role: condition
    status: modeled
    span:
      start: 128
      end: 210
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-E85FAAA6BC1CD2BF
    claim_text: When kibi-zcode is installed and enabled, it must not write directly to .kb
    role: condition
    status: modeled
    span:
      start: 213
      end: 288
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-A06F5E6FD38C24EE
    claim_text: When kibi-zcode is installed and enabled, it must not replace MCP tooling behavior
    role: condition
    status: modeled
    span:
      start: 291
      end: 373
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-F8AF7D7F356F442D
    claim_text: The kibi-zcode adapter must not provide a hard enforcement gate
    role: normative
    status: modeled
    span:
      start: 376
      end: 439
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
  - claim_key: CLAIM-E4C1D85972D18D64
    claim_text: Kibi git hooks installed by kibi init must remain the hard enforcement gate
    role: normative
    status: modeled
    span:
      start: 442
      end: 517
    payload_hash: bd70bcd9e024f0d104fb363f2b39b7b903c6f85f18bb87b0181497913d0270ec
id: REQ-zcode-advisory-enforcement-boundary-v1
type: req
---
The kibi-zcode adapter's asset scope is declarative plugin assets.

The kibi-zcode adapter's lifecycle-hook scope is advisory.

When kibi-zcode is installed and enabled, each of its outputs must remain advisory.

When kibi-zcode is installed and enabled, it must not write directly to .kb.

When kibi-zcode is installed and enabled, it must not replace MCP tooling behavior.

The kibi-zcode adapter must not provide a hard enforcement gate.

Kibi git hooks installed by kibi init must remain the hard enforcement gate.
