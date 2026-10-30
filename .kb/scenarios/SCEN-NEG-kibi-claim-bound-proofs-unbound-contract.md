---
title: kibi check fails certificate contracts that name no claims or an unknown claim
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:07:54.303Z'
id: SCEN-NEG-kibi-claim-bound-proofs-unbound-contract
type: scenario
---
Given an exhaustive proof contract that names no claims in proves and another that names a claim key no current requirement has, when `kibi check --rules proof-contract-claims` runs, then both contracts are reported as violations and the unknown claim gets a rejected binding with its reason.

This is the failure side of claim-bound proofs: a certificate that does not say which claim it proves cannot earn proved evidence for any. documentation/tests/e2e/packed/claim-bound-proofs.test.ts "binds a certificate to the claims it derives and rejects the rest with the reason" exercises it.
