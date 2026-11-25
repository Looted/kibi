---
title: kibi migrate refreshes outdated kibi-managed Git hook sections
status: open
firmness: firm
origin:
  kind: human
  ref: 'Po aktualizacji z 2.44.0 polecenie `migrate --yes` nie odświeża już sekcji hooków zarządzanych przez kibi, więc `kibi doctor` kończy się kodem 1 i pokazuje „Kibi-managed hook sections: Outdated” dla post-checkout, post-merge, post-rewrite i pre-commit. Dotyczy to też projektów, w których hooki zainstalował build `f408f3d`, choć wersja jest ta sama (2.45.0).'
  recorded_at: '2026-11-25T09:43:43.231Z'
priority: must
tags:
  - cli
  - migration
  - hooks
  - git
rationale: 'The maintainer reported a regression: after upgrading from 2.44.0, `kibi migrate --yes` no longer refreshed the kibi-managed hook sections, so `kibi doctor` exited 1 with "Kibi-managed hook sections: Outdated" for post-checkout, post-merge, post-rewrite and pre-commit until `kibi init` ran. It also hit projects whose hooks a build with the same version string had installed, so the refresh must compare template content, not versions.'
semantic_text: kibi migrate must rewrite a Git hook's kibi-managed section when that section differs from the template the running CLI installs, and must leave a hook unchanged when a hook manager owns it or it has no kibi-managed section.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6276f2a3097995b0f343caf115a934b30f2d9bc818a8825c930ca5b5d13e1186
semantic_inventory:
  - claim_key: CLAIM-96BEC295651FB56D
    claim_text: kibi migrate must rewrite a Git hook's kibi-managed section when that section differs from the template the running CLI installs, and must leave a hook unchanged when a hook manager owns it or it has no kibi-managed section
    role: normative
    status: modeled
    span:
      start: 0
      end: 223
logic_claims:
  - CLAIM-96BEC295651FB56D
id: REQ-cli-migrate-managed-hooks-refresh
type: req
---
kibi migrate must rewrite a Git hook's kibi-managed section when that section differs from the template the running CLI installs, and must leave a hook unchanged when a hook manager owns it or it has no kibi-managed section.

## Context

The maintainer reported a regression: after upgrading from 2.44.0, `kibi migrate --yes` no longer refreshed the kibi-managed hook sections, so `kibi doctor` exited 1 with "Kibi-managed hook sections: Outdated" for post-checkout, post-merge, post-rewrite and pre-commit until `kibi init` ran. It also hit projects whose hooks a build with the same version string had installed, so the refresh must compare template content, not versions.

## Source

> Po aktualizacji z 2.44.0 polecenie `migrate --yes` nie odświeża już sekcji hooków zarządzanych przez kibi, więc `kibi doctor` kończy się kodem 1 i pokazuje „Kibi-managed hook sections: Outdated” dla post-checkout, post-merge, post-rewrite i pre-commit. Dotyczy to też projektów, w których hooki zainstalował build `f408f3d`, choć wersja jest ta sama (2.45.0).
