---
title: Outside contributions require the Kibi CLA
status: accepted
tags:
  - governance
  - licensing
  - contributing
origin:
  kind: agent
  recorded_at: '2026-11-25T06:02:26.361Z'
id: ADR-contributions-require-cla
type: adr
---
# ADR: Outside contributions require the Kibi CLA

## Context

Kibi is distributed under AGPL-3.0-or-later with a single copyright holder. Contributions were closed. Opening them under the AGPL alone would leave each contributor owning the copyright in their changes, so Kibi could no longer be relicensed (for example under a commercial license) or transferred as a whole without every contributor's consent. A Developer Certificate of Origin only certifies provenance and grants no such rights.

## Decision

Contributions are open, and every outside contributor accepts the Kibi Contributor License Agreement (CLA.md) before their first pull request merges. The CLA assigns copyright in contributions to the maintainer and their successors and assigns, lists the transferred fields of use (as Polish copyright law requires), includes a patent license, a license back to the contributor and a fallback exclusive license, and is governed by Polish law.

The CLA workflow (.github/workflows/cla.yml) runs the CLA Assistant Lite action on pull_request_target and on pull request comments. It records signatures in signatures/cla.json on the cla-signatures branch, using only the workflow token. The maintainer account and bots are allowlisted. The workflow never checks out pull request code.

## Consequences

- Contributors sign once by commenting a fixed sentence on their pull request; unsigned pull requests fail the CLA check.
- Making the CLA check required on develop is a ruleset change the maintainer makes.
- A change to CLA.md is a new CLA version that applies only to contributors who accept it.