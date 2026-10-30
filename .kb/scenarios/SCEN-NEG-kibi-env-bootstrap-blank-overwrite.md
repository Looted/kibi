---
title: A blank value in project .env.kibi does not overwrite the user env value for the same key
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:28.297Z'
id: SCEN-NEG-kibi-env-bootstrap-blank-overwrite
type: scenario
---
Given a project .env.kibi that sets BOOT_BLANK to an empty value and a user env file that sets it to user-value, when the packed Kibi env bootstrap runs, then the blank entry is treated as unset and refused as an override: BOOT_BLANK keeps user-value and its source is user_env.

This is the failure side of blank value handling: an empty line in a more specific file must never wipe out a secret or setting defined elsewhere. documentation/tests/e2e/packed/cli-env-bootstrap.test.ts "process wins over project .env.kibi and blank values stay unset" exercises it.
