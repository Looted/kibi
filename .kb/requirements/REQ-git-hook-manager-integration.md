---
title: Leave Git hooks to an existing hook manager
status: open
priority: must
tags:
  - git
  - hooks
semantic_text: '`kibi init` must not install Git hooks when lefthook, husky or the pre-commit framework manages them, and must print that manager''s configuration for Kibi''s hook commands instead. `kibi init --print-hook` must print Kibi''s hook commands in shell, lefthook, husky and pre-commit formats. `kibi doctor` must read Kibi''s hook commands from the hook manager configuration and must report a managed hook whose Kibi commands it cannot see as a warning, not a failure.'
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-29: "Teams that already use a hook manager (lefthook, husky, pre-commit, simple-git-hooks) can''t let two tools own `.git/hooks`."'
  approved_by: maintainer
  recorded_at: '2026-10-29T18:38:06.101Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4e9b8efb2cee5252f8e308c25f58f471abc55c980727c3ff5b1afaffb6c7b3f4
semantic_inventory:
  - claim_key: CLAIM-BE41ACA9963AF91D
    claim_text: '`kibi init` must not install Git hooks when lefthook, husky or the pre-commit framework manages them, and must print that manager''s configuration for Kibi''s hook commands instead. `kibi init --print-hook` must print Kibi''s hook commands in shell, lefthook, husky and pre-commit formats. `kibi doctor` must read Kibi''s hook commands from the hook manager configuration'
    role: normative
    status: modeled
    span:
      start: 0
      end: 367
  - claim_key: CLAIM-4607FB568E1208EC
    claim_text: must report a managed hook whose Kibi commands it cannot see as a warning, not a failure
    role: normative
    status: modeled
    span:
      start: 372
      end: 460
logic_claims:
  - CLAIM-BE41ACA9963AF91D
  - CLAIM-4607FB568E1208EC
id: REQ-git-hook-manager-integration
type: req
firmness: firm
---
`kibi init` must not install Git hooks when lefthook, husky or the pre-commit framework manages them, and must print that manager's configuration for Kibi's hook commands instead. `kibi init --print-hook` must print Kibi's hook commands in shell, lefthook, husky and pre-commit formats. `kibi doctor` must read Kibi's hook commands from the hook manager configuration and must report a managed hook whose Kibi commands it cannot see as a warning, not a failure.

## Context

Git runs one script per hook, so a team that already manages hooks with lefthook, husky or the pre-commit framework cannot let `kibi init` own the hooks directory as well. A project using lefthook wired Kibi in by reading which commands Kibi's hooks run, on which hooks and under which conditions, and then `kibi doctor` failed its pre-commit check because the generated lefthook runner does not mention Kibi. The maintainer asked that Kibi detect hook managers, print the configuration in their formats from one source, and diagnose the manager configuration instead. Hooks that reach Kibi through a task runner are common, and doctor cannot read through one, so those are warnings.

## Source

Maintainer request, 2026-10-29:

> Teams that already use a hook manager (lefthook, husky, pre-commit, simple-git-hooks) can't let two tools own `.git/hooks`.
