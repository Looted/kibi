---
title: Packed kibi-runtime ships a working engine daemon for first-party consumers
status: open
priority: must
tags:
  - runtime
  - engine
  - packed
  - distribution
semantic_text: The published kibi-runtime package MUST ship a self-contained engine daemon entry point that the runtime engine client resolves without a nested kibi-cli install. A consumer installing only published kibi packages MUST be able to start the Kibi engine and serve typed queries from the installed runtime.
logic_claims:
  - CLAIM-DBB35C0D294764B4
  - CLAIM-D3DBFCAC758B2E3E
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 035af10400bb9850759cf6bf31377fdb9942ffb395f72d42cdf017d91f7667a5
semantic_inventory:
  - claim_key: CLAIM-DBB35C0D294764B4
    claim_text: The published kibi-runtime package MUST ship a self-contained engine daemon entry point that the runtime engine client resolves without a nested kibi-cli install
    role: normative
    status: modeled
    span:
      start: 0
      end: 161
    payload_hash: 3f07a1a7c241d610c2275333bd314330dccd7a4bd7f926bdf1fb86208e406696
  - claim_key: CLAIM-D3DBFCAC758B2E3E
    claim_text: A consumer installing only published kibi packages MUST be able to start the Kibi engine and serve typed queries from the installed runtime
    role: normative
    status: modeled
    span:
      start: 163
      end: 302
    payload_hash: 3f07a1a7c241d610c2275333bd314330dccd7a4bd7f926bdf1fb86208e406696
id: REQ-runtime-packed-engine-daemon
type: req
---
The published kibi-runtime package MUST ship a self-contained engine daemon entry point that the runtime engine client resolves without a nested kibi-cli install. A consumer installing only published kibi packages MUST be able to start the Kibi engine and serve typed queries from the installed runtime.
