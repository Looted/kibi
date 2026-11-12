---
title: A KB dependency cannot run code through its git values or its checkout
status: open
priority: must
tags:
  - dependencies
  - security
semantic_text: Kibi must refuse a KB dependency whose git URL or ref starts with a hyphen. A Kibi process that serves a KB dependency must not load the plugins or the env files that the dependency's checkout declares.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T13:47:33.975Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 441abe1a6c5fe9358986527686d3e4c78c9ca909d3d437f340faa18302085a0c
semantic_inventory:
  - claim_key: CLAIM-5334EEA1EC201828
    claim_text: Kibi must refuse a KB dependency whose git URL or ref starts with a hyphen
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 74
  - claim_key: CLAIM-824AC2A11EDF73F7
    claim_text: A Kibi process that serves a KB dependency must not load the plugins or the env files that the dependency's checkout declares
    role: normative
    status: missing
    span:
      start: 76
      end: 201
logic_claims:
  - CLAIM-5334EEA1EC201828
  - CLAIM-824AC2A11EDF73F7
id: REQ-kb-dependency-untrusted-input
type: req
---
Kibi must refuse a KB dependency whose git URL or ref starts with a hyphen. A Kibi process that serves a KB dependency must not load the plugins or the env files that the dependency's checkout declares.

## Context

The review of release 2026.11.2 found two ways a dependency ran code on the reading machine: a `git` or `ref` value such as `--upload-pack=<command>` reached git as an option, and the child process serving the checkout loaded the plugin its `package.json#kibi.plugins` named from a committed `node_modules`. A dependency is someone else's repository, pinned but not trusted, and reading its KB is meant to be read-only. The user's own env file still loads, because it belongs to the reader.

## Source

> Well, can you make a PR with a hotfix then?

> Yes, do all post review work in the hotfix.

Maintainer, 2026-11-12, in reply to the review of release 2026.11.2.
