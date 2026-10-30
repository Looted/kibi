---
title: kibi check rejects a tampered certificate bundle and exits 1
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:48.887Z'
id: SCEN-NEG-kibi-kb-certificates-tampered-certificate
type: scenario
---
Given a certificate bundle that `kibi check` produced for consistent facts, when one model certificate's value is changed and `kibi check --certificates` re-checks the tampered bundle, then the certificate does not re-check and the check exits 1 with the reason.

This is the failure side of knowledge-base certificates: a certificate that does not re-check must block, whoever produced it. documentation/tests/e2e/packed/kb-certificates.test.ts "certifies consistent facts and rejects a tampered certificate" exercises it.
