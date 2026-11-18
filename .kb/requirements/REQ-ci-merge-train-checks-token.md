---
title: The merge train reads check runs with its checks token
status: open
priority: should
required_evidence: tested
tags:
  - ci
  - proof
semantic_text: The merge train must read check runs with its checks token, so a train whose github-token is a fine-grained personal access token can still read the checks it gates on.
rationale: Fine-grained personal access tokens have no Checks permission, yet a train needs such a token so its pull requests and pushes start workflows. Reading check runs with the workflow's own token keeps both working.
origin:
  kind: agent
  ref: 'Maintainer report, 2026-11-18: the merge train token is a fine-grained token, and fine-grained tokens offer no check runs permission.'
  recorded_at: '2026-11-18T14:19:21.469Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 32ca652347fcf2325512458bb249b577abf078c4412ca5594f7faf5980a37ee4
semantic_inventory:
  - claim_key: CLAIM-2B93121D26C03A3F
    claim_text: The merge train must read check runs with its checks token, so a train whose github-token is a fine-grained personal access token can still read the checks it gates on
    role: normative
    status: modeled
    span:
      start: 0
      end: 167
logic_claims:
  - CLAIM-2B93121D26C03A3F
id: REQ-ci-merge-train-checks-token
type: req
---
The merge train must read check runs with its checks token, so a train whose github-token is a fine-grained personal access token can still read the checks it gates on.

## Context

Fine-grained personal access tokens have no Checks permission, yet a train needs such a token so its pull requests and pushes start workflows. Reading check runs with the workflow's own token keeps both working.

## Source

> Maintainer report, 2026-11-18: the merge train token is a fine-grained token, and fine-grained tokens offer no check runs permission.