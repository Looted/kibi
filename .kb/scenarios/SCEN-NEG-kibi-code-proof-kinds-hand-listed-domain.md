---
title: An exhaustive certificate with a hand-listed domain is rejected and stays at tested
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:08:16.384Z'
id: SCEN-NEG-kibi-code-proof-kinds-hand-listed-domain
type: scenario
---
Given an exhaustive proof contract whose certificate copies the colour list by hand instead of importing COLORS from colors.mjs, when `kibi prove` re-checks the certificate, then the certificate is rejected with the reason that it does not import COLORS from colors.mjs and the receipt stays at tested evidence.

This is the failure side of code proof kinds: a certificate over a copied domain proves nothing about the code, so it must never earn proved evidence. documentation/tests/e2e/packed/code-proof-kinds.test.ts "proves certificate kinds whose certificates re-check and keeps the rest at tested" exercises it.
