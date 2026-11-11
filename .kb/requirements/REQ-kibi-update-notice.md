---
title: The kibi CLI tells a person at a terminal when a newer kibi-cli is published
status: open
priority: should
tags:
  - release
  - cli
  - doctor
  - update-notice
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, on approving the update-notice requirement as written: "Approve as written"'
  approved_by: maintainer
  recorded_at: '2026-11-04T13:31:35.409Z'
required_evidence: tested
semantic_text: The kibi CLI must print a one-line update notice on stderr when a newer kibi-cli release is published on npm. The kibi CLI must ask the npm registry for the latest kibi-cli release from a detached background process and cache the answer for a day. The update notice must stay silent when stderr is not a terminal, when the command prints JSON, in CI and test runs, and when KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER is set. The update notice must name the KB schema change when the newer release writes a newer KB schema. Kibi doctor must report whether a newer kibi-cli release is published.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 19a666e09825bed5fb96169b06ff7e8347080628e44fc07ae5f7349bab9ba075
semantic_inventory:
  - claim_key: CLAIM-BC584F36CD3EC675
    claim_text: The kibi CLI must print a one-line update notice on stderr when a newer kibi-cli release is published on npm
    role: normative
    status: modeled
    span:
      start: 0
      end: 108
  - claim_key: CLAIM-92CE24821BA85543
    claim_text: The kibi CLI must ask the npm registry for the latest kibi-cli release from a detached background process and cache the answer for a day
    role: normative
    status: modeled
    span:
      start: 110
      end: 246
  - claim_key: CLAIM-155C8CB648B84046
    claim_text: The update notice must stay silent when stderr is not a terminal, when the command prints JSON, in CI and test runs, and when KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER is set
    role: normative
    status: modeled
    span:
      start: 248
      end: 422
  - claim_key: CLAIM-7778C5D3954FDBA4
    claim_text: The update notice must name the KB schema change when the newer release writes a newer KB schema
    role: normative
    status: modeled
    span:
      start: 424
      end: 520
  - claim_key: CLAIM-4E158DF96A545414
    claim_text: Kibi doctor must report whether a newer kibi-cli release is published
    role: normative
    status: modeled
    span:
      start: 522
      end: 591
logic_claims:
  - CLAIM-BC584F36CD3EC675
  - CLAIM-92CE24821BA85543
  - CLAIM-155C8CB648B84046
  - CLAIM-7778C5D3954FDBA4
  - CLAIM-4E158DF96A545414
id: REQ-kibi-update-notice
type: req
---
The kibi CLI must print a one-line update notice on stderr when a newer kibi-cli release is published on npm. The kibi CLI must ask the npm registry for the latest kibi-cli release from a detached background process and cache the answer for a day. The update notice must stay silent when stderr is not a terminal, when the command prints JSON, in CI and test runs, and when KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER is set. The update notice must name the KB schema change when the newer release writes a newer KB schema. Kibi doctor must report whether a newer kibi-cli release is published.

## Context

Users had no way to learn that a newer Kibi was out short of checking npm themselves, so installs drifted behind releases and KB schema changes. The maintainer asked whether Kibi should warn about available updates and approved a light notice in the style of other CLIs: a cached daily registry check in the background, one stderr line, silence in CI, JSON output, MCP stdio and under an opt-out variable, plus the KB schema change from the release manifest. Agents run commands without a terminal, so `kibi doctor` carries the same answer to every host.

## Source

Maintainer request, 2026-11-04:

> Also should kibi warn about updates available?

Approval of the proposed design:

> Yes, please build it, we'll ship it with this release.
